import type { MetadataRoute } from 'next'
import { getPayload } from 'payload'

import config from '@payload-config'
import { publicPostsWhere } from '@/lib/queries'

// Render at request time, not at build time. Build-time prerender would
// run inside Docker where DATABASE_URI isn't available, so the Payload
// query would throw and abort the whole build.
export const dynamic = 'force-dynamic'

const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3125'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/posts`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ]

  // Defense in depth: if Payload / DB is unreachable at any point, we
  // still serve the static entries instead of failing the route entirely.
  let postEntries: MetadataRoute.Sitemap = []
  let pageEntries: MetadataRoute.Sitemap = []

  try {
    const payload = await getPayload({ config })

    const [postsResult, pagesResult] = await Promise.all([
      payload.find({
        collection: 'posts',
        where: publicPostsWhere(),
        sort: '-publishedAt',
        limit: 5000,
        depth: 0,
      }),
      payload.find({
        collection: 'pages',
        where: { _status: { equals: 'published' } },
        sort: '-updatedAt',
        limit: 5000,
        depth: 0,
      }),
    ])

    postEntries = postsResult.docs.map((post) => ({
      url: `${baseUrl}/posts/${post.slug}`,
      lastModified: new Date(post.updatedAt || post.publishedAt || now),
      changeFrequency: 'weekly',
      priority: 0.7,
    }))

    pageEntries = pagesResult.docs.map((page) => ({
      url: `${baseUrl}/pages/${page.slug}`,
      lastModified: new Date(page.updatedAt || now),
      changeFrequency: 'monthly',
      priority: 0.5,
    }))
  } catch (err) {
    // Don't fail the whole sitemap response — log and serve static-only.
    console.error('sitemap: failed to load posts/pages from Payload', err)
  }

  return [...staticEntries, ...postEntries, ...pageEntries]
}
