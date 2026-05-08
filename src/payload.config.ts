import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import { redirectsPlugin } from '@payloadcms/plugin-redirects'
import { seoPlugin } from '@payloadcms/plugin-seo'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Categories } from './collections/Categories'
import { Comments } from './collections/Comments'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { Tags } from './collections/Tags'
import { Users } from './collections/Users'
import { publishScheduledPostTask } from './lib/tasks/publishScheduledPost'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const serverURL = process.env.NEXT_PUBLIC_SERVER_URL
const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Boxcar'


export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: ' — Boxcar Admin',
    },
    components: {
      // Custom view: lists posts whose `publishedAt` is set in the future
      // (= scheduled). See the file header for the Payload public-API
      // surfaces it depends on.
      views: {
        scheduledPublishes: {
          path: '/scheduled',
          Component: '/components/admin/ScheduledPublishesView',
        },
      },
      afterNavLinks: ['/components/admin/ScheduledPublishesNavLink'],
    },
  },
  collections: [Users, Media, Posts, Pages, Categories, Tags, Comments],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  serverURL,
  cors: serverURL ? [serverURL] : [],
  csrf: serverURL ? [serverURL] : [],
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
    // Dev: push schema changes automatically.
    // Prod: require an explicit migration. This stops accidental destructive
    // auto-syncs in prod and forces every schema change to land as a tracked
    // migration file.
    push: process.env.NODE_ENV !== 'production',
  }),
  sharp,
  plugins: [
    // Always register s3Storage. If R2_BUCKET / R2_ENDPOINT are unset, the
    // plugin no-ops uploads (clientProps.enabled becomes false) but stays in
    // the importMap — important because `payload generate:importmap` runs at
    // build time when R2_* vars aren't available, and a runtime-only plugin
    // registration would leave the admin's upload handler missing from the
    // map and break the Media collection UI.
    s3Storage({
      collections: {
        media: {
          prefix: 'media',
        },
      },
      enabled: Boolean(process.env.R2_BUCKET && process.env.R2_ENDPOINT),
      bucket: process.env.R2_BUCKET || '',
      // R2 ignores the canned ACL but the upstream cloud-storage plugin sends one;
      // 'public-read' is the closest no-op for R2 buckets configured as public.
      acl: 'public-read',
      config: {
        endpoint: process.env.R2_ENDPOINT,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
        },
        region: 'auto',
        forcePathStyle: true,
      },
    }),
    seoPlugin({
      collections: ['posts', 'pages'],
      uploadsCollection: 'media',
      generateTitle: ({ doc }) => {
        if (!doc?.title) return siteName
        // Skip the " — siteName" suffix for already-long titles so they
        // don't get truncated past the SERP's ~60-char window.
        return doc.title.length > 50 ? doc.title : `${doc.title} — ${siteName}`
      },
      generateDescription: ({ doc }) => doc?.excerpt || '',
    }),
    redirectsPlugin({
      collections: ['posts', 'pages'],
      overrides: {
        access: {
          read: () => true,
        },
      },
    }),
  ],
  // Jobs queue: powers our scheduled-publish flow. Editors set a future
  // publishedAt and click Publish; the Posts afterChange hook enqueues a
  // `publishScheduledPost` job here. A separate Railway cron service
  // (configured with `cronSchedule: */5 * * * *` and `startCommand: pnpm
  // jobs:run`) processes the queue — see scripts/run-jobs.ts. autoRun is
  // intentionally NOT set here so the Next.js app process stays focused
  // on serving requests.
  jobs: {
    tasks: [publishScheduledPostTask],
  },
})
