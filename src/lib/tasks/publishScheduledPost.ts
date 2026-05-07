import type { TaskConfig } from 'payload'

/**
 * Custom Payload task: flips a post's `_status` from `draft` to `published`
 * at the time the job's `waitUntil` arrives. Enqueued by the Posts
 * `afterChange` hook when an editor "publishes" with a future `publishedAt`.
 *
 * Idempotent / self-healing:
 *   - Doc was deleted → no-op.
 *   - Doc is already published (someone hit Publish manually) → no-op.
 *   - Doc's publishedAt was changed (rescheduled) → no-op for this job;
 *     the new save enqueued a fresh job for the new date, so the old one
 *     can safely do nothing.
 */
export const publishScheduledPostTask: TaskConfig<'publishScheduledPost'> = {
  slug: 'publishScheduledPost',
  inputSchema: [
    { name: 'collection', type: 'text', required: true },
    { name: 'docId', type: 'text', required: true },
    // Captured at enqueue time; the handler refuses to publish if the doc's
    // current publishedAt no longer matches (= user rescheduled).
    { name: 'expectedPublishedAt', type: 'text', required: true },
  ],
  outputSchema: [],
  handler: async ({ input, req }) => {
    const { collection, docId, expectedPublishedAt } = input

    let doc
    try {
      doc = await req.payload.findByID({
        collection: collection as never,
        id: docId,
        req,
        depth: 0,
        draft: true,
      })
    } catch {
      // Doc deleted or otherwise unreachable.
      return { output: {} }
    }

    if (!doc) return { output: {} }
    if ((doc as { _status?: string })._status === 'published') return { output: {} }

    const currentPublishedAt = (doc as { publishedAt?: string | null }).publishedAt
    if (!currentPublishedAt) return { output: {} }
    if (new Date(currentPublishedAt).getTime() !== new Date(expectedPublishedAt).getTime()) {
      // User rescheduled; a different job will handle the new date.
      return { output: {} }
    }

    await req.payload.update({
      collection: collection as never,
      id: docId,
      data: { _status: 'published' },
      req,
      overrideAccess: true,
    })

    return { output: {} }
  },
}
