import type { CollectionConfig } from 'payload'

import { authenticated } from '../access/authenticated'
import { authenticatedOrPublished } from '../access/authenticatedOrPublished'
import { legacyField } from '../fields/legacy'
import { slugField } from '../fields/slug'
import { revalidatePagePaths } from '../lib/revalidate'

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', '_status'],
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
    { name: 'title', type: 'text', required: true },
    slugField('title'),
    { name: 'content', type: 'richText' },
    legacyField,
  ],
  hooks: {
    afterChange: [
      ({ doc, previousDoc }) => {
        revalidatePagePaths(doc.slug)
        if (previousDoc?.slug && previousDoc.slug !== doc.slug) {
          revalidatePagePaths(previousDoc.slug)
        }
      },
    ],
    afterDelete: [
      ({ doc }) => {
        revalidatePagePaths(doc?.slug)
      },
    ],
  },
}
