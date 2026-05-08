/**
 * Helpers used by collection hooks (Posts, Pages) and the
 * publishScheduledPost task to invalidate Next.js's route cache after a
 * doc changes. Keeps ISR responsive — without these, edits would only
 * appear after the natural revalidate window.
 *
 * Importing `revalidatePath` from 'next/cache' is safe inside Payload
 * hooks because Payload runs inside the Next.js process.
 */
import { revalidatePath } from 'next/cache'

export function revalidatePostPaths(slug?: string | null) {
  // Listings that show this post.
  revalidatePath('/')
  revalidatePath('/posts')
  // The post's own URL (and the sitemap, which Next.js caches separately).
  if (slug) revalidatePath(`/posts/${slug}`)
  revalidatePath('/sitemap.xml')
}

export function revalidatePagePaths(slug?: string | null) {
  if (slug) revalidatePath(`/pages/${slug}`)
  revalidatePath('/sitemap.xml')
}
