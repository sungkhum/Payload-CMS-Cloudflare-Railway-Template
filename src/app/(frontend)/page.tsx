import config from '@payload-config'
import { getPayload } from 'payload'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { publicPostsWhere } from '@/lib/queries'
import { Separator } from '@/components/ui/separator'

// Cache for 60s; admin edits trigger revalidatePath via Posts afterChange hooks.
export const revalidate = 60

async function loadHomePosts() {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'posts',
    where: publicPostsWhere(),
    sort: '-publishedAt',
    limit: 10,
    depth: 1,
  })
  return docs
}

export default async function HomePage() {
  // Wrap the Payload query so build-time prerender doesn't abort if the DB
  // isn't reachable (Docker build doesn't get DATABASE_URI as a build ARG).
  // After deploy, the first runtime request fetches real data and the ISR
  // cache refreshes from there.
  let posts: Awaited<ReturnType<typeof loadHomePosts>> = []
  try {
    posts = await loadHomePosts()
  } catch (err) {
    console.error('HomePage: failed to load posts from Payload', err)
  }

  const [hero, ...rest] = posts

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <section className="stagger-in">
        <p className="font-sans text-xs uppercase tracking-[0.18em] text-muted-foreground">
          The blog
        </p>
        <h1 className="mt-3 text-4xl leading-[1.05] sm:text-5xl">
          Notes, ideas, and longer thoughts.
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
          A small home for writing that takes its time. Updated when there&apos;s something worth
          saying.
        </p>
      </section>

      {posts.length === 0 ? (
        <p className="mt-16 font-sans text-sm text-muted-foreground stagger-in stagger-in-delay-1">
          No posts yet.{' '}
          <Link href="/admin" className="text-primary underline underline-offset-4">
            Sign in
          </Link>{' '}
          to write the first one.
        </p>
      ) : (
        <>
          {hero && (
            <article className="mt-16 stagger-in stagger-in-delay-1">
              <Link href={`/posts/${hero.slug}`} className="group block">
                <p className="font-sans text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Latest
                </p>
                <h2 className="mt-3 text-3xl leading-tight transition-colors group-hover:text-primary sm:text-4xl">
                  {hero.title}
                </h2>
                {hero.excerpt && (
                  <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
                    {hero.excerpt}
                  </p>
                )}
                {hero.publishedAt && (
                  <time
                    dateTime={hero.publishedAt}
                    className="mt-4 inline-block font-sans text-sm text-muted-foreground"
                  >
                    {formatDate(hero.publishedAt)}
                  </time>
                )}
              </Link>
            </article>
          )}

          {rest.length > 0 && (
            <section className="mt-16 stagger-in stagger-in-delay-2">
              <Separator />
              <ul className="divide-y divide-border/60">
                {rest.map((post) => (
                  <li key={post.id} className="py-6">
                    <Link href={`/posts/${post.slug}`} className="group block">
                      <h3 className="text-xl transition-colors group-hover:text-primary">
                        {post.title}
                      </h3>
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
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
