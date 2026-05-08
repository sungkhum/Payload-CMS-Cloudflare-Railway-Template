import config from '@payload-config'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { getPayload } from 'payload'
import type { Metadata } from 'next'
import type { Where } from 'payload'
import { notFound } from 'next/navigation'

export const revalidate = 60

type Props = {
  params: Promise<{ slug: string }>
}

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Boxcar'

const slugWhere = (slug: string): Where => ({
  and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }],
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'pages',
    where: slugWhere(slug),
    limit: 1,
  })
  const page = docs[0]
  if (!page) return {}

  const titleSuffix = page.title.length > 50 ? '' : ` — ${siteName}`

  return {
    title: `${page.title}${titleSuffix}`,
    alternates: {
      canonical: `/pages/${slug}`,
    },
    openGraph: {
      type: 'website',
      title: page.title,
      url: `/pages/${slug}`,
      siteName,
    },
    twitter: {
      card: 'summary',
      title: page.title,
    },
  }
}

export default async function StaticPage({ params }: Props) {
  const { slug } = await params
  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'pages',
    where: slugWhere(slug),
    limit: 1,
    depth: 1,
  })

  const page = docs[0]
  if (!page) notFound()

  return (
    <article className="mx-auto max-w-2xl px-6 py-16">
      <header className="stagger-in">
        <h1 className="text-4xl leading-[1.05] sm:text-5xl">{page.title}</h1>
      </header>
      {page.content && (
        <div className="mt-10 stagger-in stagger-in-delay-1 prose-article">
          <RichText data={page.content} />
        </div>
      )}
    </article>
  )
}
