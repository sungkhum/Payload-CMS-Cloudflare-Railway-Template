import config from '@payload-config'
import { getPayload } from 'payload'
import Link from 'next/link'

import { formatDate } from '@/lib/utils'
import { publicPostsWhere } from '@/lib/queries'

export const revalidate = 60

const PAGE_SIZE = 10

type Props = {
  searchParams: Promise<{ page?: string }>
}

export default async function PostsIndex({ searchParams }: Props) {
  const { page: pageParam } = await searchParams
  const requested = Number.parseInt(pageParam || '1', 10)
  const page = Number.isFinite(requested) && requested > 0 ? requested : 1

  const payload = await getPayload({ config })

  const { docs: posts, totalPages, totalDocs } = await payload.find({
    collection: 'posts',
    where: publicPostsWhere(),
    sort: '-publishedAt',
    limit: PAGE_SIZE,
    page,
  })

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <header className="stagger-in">
        <p className="font-sans text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Archive
        </p>
        <h1 className="mt-3 text-4xl leading-[1.05]">All posts</h1>
        {totalDocs > 0 && (
          <p className="mt-3 font-sans text-sm text-muted-foreground tabular">
            {totalDocs} {totalDocs === 1 ? 'post' : 'posts'}
          </p>
        )}
      </header>

      <ul className="mt-12 divide-y divide-border/60 stagger-in stagger-in-delay-1">
        {posts.map((post) => (
          <li key={post.id} className="py-6">
            <Link href={`/posts/${post.slug}`} className="group block">
              <h2 className="text-xl transition-colors group-hover:text-primary">{post.title}</h2>
              {post.excerpt && (
                <p className="mt-1 leading-relaxed text-muted-foreground">{post.excerpt}</p>
              )}
              {post.publishedAt && (
                <time
                  dateTime={post.publishedAt}
                  className="mt-2 inline-block font-sans text-xs text-muted-foreground"
                >
                  {formatDate(post.publishedAt)}
                </time>
              )}
            </Link>
          </li>
        ))}
        {posts.length === 0 && (
          <li className="py-6 font-sans text-sm text-muted-foreground">No posts yet.</li>
        )}
      </ul>

      {totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} />
      )}
    </div>
  )
}

function Pagination({ currentPage, totalPages }: { currentPage: number; totalPages: number }) {
  const prev = currentPage > 1 ? currentPage - 1 : null
  const next = currentPage < totalPages ? currentPage + 1 : null

  // Compact numeric range: always show 1, last, current ± 1, plus ellipses.
  const range: (number | 'ellipsis')[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - 1 && i <= currentPage + 1)
    ) {
      range.push(i)
    } else if (range[range.length - 1] !== 'ellipsis') {
      range.push('ellipsis')
    }
  }

  return (
    <nav
      aria-label="Pagination"
      className="mt-12 flex items-center justify-between border-t border-border/60 pt-6 font-sans text-sm"
    >
      {prev ? (
        <Link
          href={prev === 1 ? '/posts' : `/posts?page=${prev}`}
          className="text-muted-foreground transition-colors hover:text-foreground"
          rel="prev"
        >
          ← Newer
        </Link>
      ) : (
        <span className="text-muted-foreground/50">← Newer</span>
      )}

      <ul className="flex items-center gap-1 tabular">
        {range.map((entry, i) =>
          entry === 'ellipsis' ? (
            <li key={`e-${i}`} className="px-2 text-muted-foreground/60">
              …
            </li>
          ) : (
            <li key={entry}>
              <Link
                href={entry === 1 ? '/posts' : `/posts?page=${entry}`}
                aria-current={entry === currentPage ? 'page' : undefined}
                className={
                  entry === currentPage
                    ? 'rounded px-3 py-1 text-foreground'
                    : 'rounded px-3 py-1 text-muted-foreground transition-colors hover:text-foreground'
                }
              >
                {entry}
              </Link>
            </li>
          ),
        )}
      </ul>

      {next ? (
        <Link
          href={`/posts?page=${next}`}
          className="text-muted-foreground transition-colors hover:text-foreground"
          rel="next"
        >
          Older →
        </Link>
      ) : (
        <span className="text-muted-foreground/50">Older →</span>
      )}
    </nav>
  )
}
