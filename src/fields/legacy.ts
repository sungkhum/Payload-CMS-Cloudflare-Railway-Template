import type { Field } from 'payload'

export const legacyField: Field = {
  name: 'legacy',
  type: 'group',
  label: 'Legacy WordPress',
  admin: {
    // Hidden from the admin UI — purely a server-side handhold for the WP
    // migration script. The fields still exist in the DB and the REST/
    // GraphQL APIs so the script can write them.
    hidden: true,
    position: 'sidebar',
    description: 'Populated by the WP migration script — do not edit manually.',
  },
  fields: [
    {
      name: 'wpId',
      type: 'number',
      index: true,
      admin: { description: 'Original WordPress post/page/comment ID' },
    },
    {
      name: 'wpUrl',
      type: 'text',
      admin: { description: 'Original WordPress permalink (used to build redirects)' },
    },
  ],
}
