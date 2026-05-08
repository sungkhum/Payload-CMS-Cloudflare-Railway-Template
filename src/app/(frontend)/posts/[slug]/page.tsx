import config from '@payload-config'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { getPayload } from 'payload'
import type { Metadata } from 'next'
import type { Where } from 'payload'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

import { formatDate } from '@/lib/utils'
import { publicPostsWhere } from '@/lib/queries'
import { blogPostingJsonLd, breadcrumbsJsonLd } from '@/lib/jsonld'

export const revalidate = 60

type Props = {
  params: Promise<{ slug: string }>
}

const slugWhere = (slug: string): Where => ({
  and: [{ slug: { equals: slug } }, publicPostsWhere()],
})

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Boxcar'

type MediaDoc = { url?: string | null; alt?: string | null; width?: number | null; height?: number | null }
type AuthorDoc = { id: string | number; name?: string | null }

const getFeaturedImage = (post: { featuredImage?: unknown }): MediaDoc | null => {
  const fi = post.featuredImage
  if (fi && typeof fi === 'object' && 'url' in (fi as Record<string, unknown>)) return fi as MediaDoc
  return null
}

const getAuthors = (post: { authors?: unknown }): AuthorDoc[] => {
  const arr = post.authors
  if (!Array.isArray(arr)) return []
  return arr.filter(
    (a): a is AuthorDoc => typeof a === 'object' && a !== null && 'id' in (a as Record<string, unknown>),
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'posts',
    where: slugWhere(slug),
    limit: 1,
    depth: 1,
  })
  const post = docs[0]
  if (!post) return {}

  const titleSuffix = post.title.length > 50 ? '' : ` — ${siteName}`
  const featured = getFeaturedImage(post)
  const ogImages = featured?.url
    ? [{ url: featured.url, alt: featured.alt || post.title, width: featured.width || undefined, height: featured.height || undefined }]
    : []
  const authors = getAuthors(post).map((a) => a.name).filter((n): n is string => Boolean(n))

  return {
    title: `${post.title}${titleSuffix}`,
    description: post.excerpt || undefined,
    alternates: {
      canonical: `/posts/${slug}`,
    },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt || undefined,
      url: `/posts/${slug}`,
      siteName,
      publishedTime: post.publishedAt || undefined,
      modifiedTime: post.updatedAt || undefined,
      authors: authors.length > 0 ? authors : undefined,
      images: ogImages,
    },
    twitter: {
      card: ogImages.length > 0 ? 'summary_large_image' : 'summary',
      title: post.title,
      description: post.excerpt || undefined,
      images: ogImages.map((i) => i.url),
    },
  }
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params
  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'posts',
    where: slugWhere(slug),
    limit: 1,
    depth: 2,
  })

  const post = docs[0]
  if (!post) notFound()

  const featured = getFeaturedImage(post)
  const authors = getAuthors(post)
  const authorNames = authors.map((a) => a.name).filter((n): n is string => Boolean(n))

  const blogPosting = blogPostingJsonLd({
    title: post.title,
    slug,
    excerpt: post.excerpt,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    authors: authors.map((a) => ({ name: a.name })),
    image: featured ? { url: featured.url, alt: featured.alt } : null,
  })

  const breadcrumbs = breadcrumbsJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Posts', url: '/posts' },
    { name: post.title, url: `/posts/${slug}` },
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPosting) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <article className="mx-auto max-w-2xl px-6 py-16">
        <Link
          href="/posts"
          className="inline-flex items-center gap-1 font-sans text-sm text-muted-foreground transition-colors hover:text-foreground stagger-in"
        >
          <span aria-hidden>←</span> All posts
        </Link>

        <header className="mt-8 stagger-in stagger-in-delay-1">
          {post.publishedAt && (
            <time
              dateTime={post.publishedAt}
              className="font-sans text-sm text-muted-foreground"
            >
              {formatDate(post.publishedAt)}
            </time>
          )}
          <h1 className="mt-3 text-4xl leading-[1.05] sm:text-5xl">{post.title}</h1>
          {post.excerpt && (
            <p className="mt-4 text-xl leading-relaxed text-muted-foreground">{post.excerpt}</p>
          )}
          {authorNames.length > 0 && (
            <p className="mt-4 font-sans text-sm text-muted-foreground">
              By {authorNames.join(', ')}
            </p>
          )}
        </header>

        {featured?.url && (
          <figure className="mt-10 stagger-in stagger-in-delay-2">
            <Image
              src={featured.url}
              alt={featured.alt || post.title}
              width={featured.width || 1920}
              height={featured.height || 1080}
              priority
              className="h-auto w-full rounded-lg object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </figure>
        )}

        {post.content && (
          <div className="mt-12 stagger-in stagger-in-delay-2 prose-article">
            <RichText data={post.content} />
          </div>
        )}
      </article>
    </>
  )
}
