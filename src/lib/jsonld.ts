/**
 * JSON-LD builders for SEO. Inject the returned objects into a page via:
 *
 *   <script
 *     type="application/ld+json"
 *     dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
 *   />
 *
 * Schema.org types used:
 *   - WebSite (root layout)
 *   - BlogPosting (post detail)
 *   - BreadcrumbList (post detail)
 */

const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3125'
const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Boxcar'

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/posts?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

type Author = { name?: string | null }
type ImageRef = { url?: string | null; alt?: string | null }

export function blogPostingJsonLd(args: {
  title: string
  slug: string
  excerpt?: string | null
  publishedAt?: string | null
  updatedAt?: string | null
  authors?: Author[]
  image?: ImageRef | null
}) {
  const url = `${baseUrl}/posts/${args.slug}`
  const authors = (args.authors || [])
    .map((a) => a?.name)
    .filter((n): n is string => Boolean(n))
    .map((name) => ({ '@type': 'Person', name }))

  const image = args.image?.url ? [absolute(args.image.url)] : undefined

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: args.title,
    description: args.excerpt || undefined,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    datePublished: args.publishedAt || undefined,
    dateModified: args.updatedAt || args.publishedAt || undefined,
    author: authors.length === 1 ? authors[0] : authors.length > 1 ? authors : undefined,
    image,
    publisher: {
      '@type': 'Organization',
      name: siteName,
      url: baseUrl,
    },
  }
}

export function breadcrumbsJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absolute(item.url),
    })),
  }
}

function absolute(url: string): string {
  if (/^https?:\/\//.test(url)) return url
  return `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`
}
