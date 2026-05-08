import type { MetadataRoute } from 'next'
import { getPayload } from 'payload'

import config from '@payload-config'
import { publicPostsWhere } from '@/lib/queries'

const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3125'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  const postEntries: MetadataRoute.Sitemap = postsResult.docs.map((post) => ({
    url: `${baseUrl}/posts/${post.slug}`,
    lastModified: new Date(post.updatedAt || post.publishedAt || now),
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const pageEntries: MetadataRoute.Sitemap = pagesResult.docs.map((page) => ({
    url: `${baseUrl}/pages/${page.slug}`,
    lastModified: new Date(page.updatedAt || now),
    changeFrequency: 'monthly',
    priority: 0.5,
  }))

  return [...staticEntries, ...postEntries, ...pageEntries]
}
