import type { CollectionConfig } from 'payload'

import { authenticated } from '../access/authenticated'
import { authenticatedOrPublished } from '../access/authenticatedOrPublished'
import { legacyField } from '../fields/legacy'
import { slugField } from '../fields/slug'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'authors', 'publishedAt', '_status'],
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
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
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
          data.publishedAt = now.toISOString()
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation !== 'create' && operation !== 'update') return doc

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
              collection: 'posts',
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
  },
}
