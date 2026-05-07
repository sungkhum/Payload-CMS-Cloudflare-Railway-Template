import type { Where } from 'payload'

/**
 * Where clause for Posts that should be visible to the public.
 *
 * Scheduled posts live as `_status: draft` (with a future `publishedAt`)
 * until the `publishScheduledPost` job flips them. So a simple status check
 * is enough — no date math needed at the read site.
 */
export const publicPostsWhere = (): Where => ({
  _status: { equals: 'published' },
})
