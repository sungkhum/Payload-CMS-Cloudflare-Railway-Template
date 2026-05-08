import type { MetadataRoute } from 'next'

const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3125'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/', '/api', '/api/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
