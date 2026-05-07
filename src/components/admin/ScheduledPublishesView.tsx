/**
 * Custom admin view at /admin/scheduled — lists Posts that are queued to
 * auto-publish via the `publishScheduledPost` job. A post sits in this
 * view from the moment an editor "publishes" with a future date (the
 * Posts beforeChange hook demotes it to draft and the afterChange hook
 * enqueues a job) until the cron fires and flips _status → published.
 *
 * Query convention: `_status: draft` AND `publishedAt > now()`.
 *
 * Payload public-API surfaces this view depends on (smoke-test on upgrades):
 *   1. `admin.components.views` server-component prop shape (`AdminViewServerProps`).
 *   2. `getPayload({ config }).find({ collection: 'posts', ... })` — Local API.
 *   3. Payload's CSS variables (`--theme-*`) for visual consistency
 *      with the admin shell.
 *
 * Deliberately avoided: any import from `@payloadcms/ui`, any deep import
 * from `payload/dist`. The view doesn't touch the `payload-jobs` collection
 * directly — scheduling intent is encoded on the post itself.
 */
import type { AdminViewServerProps } from 'payload'
import { getPayload } from 'payload'
import { redirect } from 'next/navigation'

import config from '@payload-config'

const ScheduledPublishesView = async ({ initPageResult }: AdminViewServerProps) => {
  const { req } = initPageResult

  if (!req?.user) {
    redirect('/admin/login?redirect=/admin/scheduled')
  }

  const payload = await getPayload({ config })

  let posts: Array<{
    id: string | number
    title?: string
    slug?: string
    publishedAt?: string
  }> = []
  let loadError: string | null = null

  try {
    const result = await payload.find({
      collection: 'posts',
      where: {
        and: [
          { _status: { equals: 'draft' } },
          { publishedAt: { greater_than: new Date().toISOString() } },
        ],
      },
      sort: 'publishedAt',
      limit: 100,
      depth: 0,
      draft: true,
      overrideAccess: false,
      user: req.user,
    })
    posts = result.docs as typeof posts
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err)
  }

  return (
    <div
      style={{
        padding: 'calc(var(--base) * 2) calc(var(--base) * 3)',
        maxWidth: '64rem',
        margin: '0 auto',
        color: 'var(--theme-text)',
      }}
    >
      <header style={{ marginBottom: 'calc(var(--base) * 2)' }}>
        <h1 style={{ marginBottom: 'calc(var(--base) * 0.5)' }}>Scheduled posts</h1>
        <p style={{ color: 'var(--theme-elevation-500)', fontSize: '0.95rem' }}>
          Posts that are published but not yet visible — their <code>publishedAt</code>{' '}
          is in the future. They appear on the public site automatically once their date arrives.
        </p>
      </header>

      {loadError && (
        <div
          role="alert"
          style={{
            padding: 'calc(var(--base) * 1.5)',
            border: '1px solid var(--theme-error-500)',
            borderRadius: 'var(--style-radius-s)',
            background: 'var(--theme-error-50)',
            color: 'var(--theme-error-700)',
          }}
        >
          <strong>Couldn’t load scheduled posts.</strong>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            {loadError}
          </div>
        </div>
      )}

      {!loadError && posts.length === 0 && (
        <div
          style={{
            padding: 'calc(var(--base) * 2)',
            textAlign: 'center',
            color: 'var(--theme-elevation-500)',
            border: '1px dashed var(--theme-elevation-150)',
            borderRadius: 'var(--style-radius-s)',
          }}
        >
          Nothing scheduled. Set a future <code>publishedAt</code> on a post and click Publish.
        </div>
      )}

      {!loadError && posts.length > 0 && (
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.95rem',
          }}
        >
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--theme-elevation-500)' }}>
              <th style={th}>Post</th>
              <th style={th}>Slug</th>
              <th style={th}>Goes live</th>
              <th style={th}>In</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => {
              const when = post.publishedAt ? new Date(post.publishedAt) : null
              return (
                <tr
                  key={post.id}
                  style={{ borderTop: '1px solid var(--theme-elevation-100)' }}
                >
                  <td style={td}>
                    <a
                      href={`/admin/collections/posts/${post.id}`}
                      style={{ color: 'var(--theme-text)', textDecoration: 'underline' }}
                    >
                      {post.title || '(untitled)'}
                    </a>
                  </td>
                  <td style={{ ...td, color: 'var(--theme-elevation-500)' }}>
                    <code style={{ fontSize: '0.85rem' }}>{post.slug || '—'}</code>
                  </td>
                  <td style={td}>{when ? when.toLocaleString() : '—'}</td>
                  <td style={{ ...td, color: 'var(--theme-elevation-500)' }}>
                    {when ? formatRelative(when) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

const th: React.CSSProperties = {
  padding: 'calc(var(--base) * 0.75) calc(var(--base) * 0.5)',
  fontWeight: 500,
  fontSize: '0.85rem',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

const td: React.CSSProperties = {
  padding: 'calc(var(--base) * 1) calc(var(--base) * 0.5)',
  verticalAlign: 'top',
}

function formatRelative(when: Date): string {
  const diffMs = when.getTime() - Date.now()
  const abs = Math.abs(diffMs)
  const minute = 60_000
  const hour = 3_600_000
  const day = 86_400_000
  if (abs < hour) return `${Math.round(diffMs / minute)}m`
  if (abs < day) return `${Math.round(diffMs / hour)}h`
  return `${Math.round(diffMs / day)}d`
}

export default ScheduledPublishesView
