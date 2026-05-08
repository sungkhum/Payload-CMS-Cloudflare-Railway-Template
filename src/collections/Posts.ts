import type { CollectionConfig } from 'payload'

import { authenticated } from '../access/authenticated'
import { authenticatedOrPublished } from '../access/authenticatedOrPublished'
import { legacyField } from '../fields/legacy'
import { slugField } from '../fields/slug'
import { revalidatePostPaths } from '../lib/revalidate'

// Snap a Date to the nearest 30-minute boundary in UTC. Round (not floor)
// so a post saved at 14:14 publishes at 14:00 and 14:16 publishes at 14:30
// — closest to what the user picked.
function snapToHalfHour(d: Date): Date {
  const r = new Date(d)
  const minutes = r.getUTCMinutes()
  const snapped = Math.round(minutes / 30) * 30
  r.setUTCMinutes(snapped, 0, 0)
  return r
}

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'authors', 'publishedAt', '_status'],
    components: {
      edit: {
        // Custom Publish button that switches its label to "Schedule
        // Post" when publishedAt is in the future. See the file for
        // coupling surfaces.
        PublishButton: '/components/admin/SchedulePublishButton',
      },
    },
  },
  access: {
    read: authenticatedOrPublished,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  versions: {
    drafts: {
      autosave: { interval: 800 },
    },
    maxPerDoc: 25,
  },
  fields: [
    { name: 'title', type: 'text', required: true, index: true },
    slugField('title'),
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Content',
          fields: [
            {
              name: 'excerpt',
              type: 'textarea',
              admin: { description: 'Short summary used in listings and SEO descriptions.' },
            },
            { name: 'content', type: 'richText', required: true },
          ],
        },
        {
          label: 'Meta',
          fields: [
            { name: 'featuredImage', type: 'upload', relationTo: 'media' },
            {
              name: 'categories',
              type: 'relationship',
              relationTo: 'categories',
              hasMany: true,
            },
            { name: 'tags', type: 'relationship', relationTo: 'tags', hasMany: true },
          ],
        },
      ],
    },
    {
      name: 'authors',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'publishedAt',
      type: 'date',
      // Default to "now, snapped to the nearest 30-min boundary" so the
      // form is ready to publish immediately without the editor having to
      // pick a date. They only touch the picker when scheduling.
      defaultValue: () => snapToHalfHour(new Date()).toISOString(),
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
          // Cron runs every 30 min, so the picker only offers slots
          // aligned to those boundaries (:00 / :30).
          timeIntervals: 30,
        },
        // Dynamic description: shows "Scheduled — will publish in N days"
        // when set to a future date, otherwise "Publishes immediately."
        components: {
          Description: '/components/admin/PublishedAtDescription',
        },
      },
    },
    legacyField,
  ],
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        if (operation !== 'create' && operation !== 'update') return data
        if (data?._status !== 'published') return data

        // Snap publishedAt to the nearest 30-minute boundary so it lines
        // up with the cron service that fires at :00 and :30 each hour.
        // (The picker enforces this in the UI; this is the safety net for
        // API/programmatic writes.)
        if (data.publishedAt) {
          data.publishedAt = snapToHalfHour(new Date(data.publishedAt)).toISOString()
        }

        const now = new Date()
        const target = data.publishedAt ? new Date(data.publishedAt) : null

        if (target && target.getTime() > now.getTime()) {
          // Publishing with a future date = schedule. Demote to draft so the
          // post stays hidden until the cron fires; the afterChange hook will
          // enqueue a `publishScheduledPost` job to flip it back at `publishedAt`.
          data._status = 'draft'
          return data
        }

        // Otherwise: regular publish. Fill publishedAt if blank.
        if (!data.publishedAt) {
          data.publishedAt = snapToHalfHour(now).toISOString()
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        if (operation !== 'create' && operation !== 'update') return doc

        // Invalidate Next.js ISR cache for affected paths so admin edits
        // appear without waiting for the natural 60s revalidation.
        revalidatePostPaths(doc.slug)
        if (previousDoc?.slug && previousDoc.slug !== doc.slug) {
          // Slug changed — bust the old URL too.
          revalidatePostPaths(previousDoc.slug)
        }

        const isScheduled =
          doc._status === 'draft' &&
          doc.publishedAt &&
          new Date(doc.publishedAt).getTime() > Date.now()

        if (!isScheduled) return doc

        // Enqueue the publish job. The handler is idempotent — if the doc is
        // saved again with a different publishedAt, the old job will see a
        // mismatch when it runs and no-op.
        try {
          await req.payload.jobs.queue({
            task: 'publishScheduledPost',
            input: {
              docId: String(doc.id),
              expectedPublishedAt: new Date(doc.publishedAt).toISOString(),
            },
            waitUntil: new Date(doc.publishedAt),
          })
        } catch (err) {
          req.payload.logger.error(
            { err, docId: doc.id },
            'Failed to enqueue scheduled-publish job',
          )
        }

        return doc
      },
    ],
    afterDelete: [
      ({ doc }) => {
        revalidatePostPaths(doc?.slug)
      },
    ],
  },
}
