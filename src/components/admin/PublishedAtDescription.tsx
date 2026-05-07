/**
 * Field description that mirrors the current `publishedAt` value:
 *   - blank        → "Auto-set on first publish if left blank."
 *   - now or past  → "Publishes immediately on save."
 *   - in the future → "Scheduled — will publish in N days (date)."
 *
 * Single Payload coupling surface: `useField` from `@payloadcms/ui` (a
 * documented public hook). If that ever moves, this whole component is
 * ~30 lines to rewrite.
 */
'use client'
import { useField } from '@payloadcms/ui'

export const PublishedAtDescription = () => {
  const { value } = useField<string | null | undefined>({ path: 'publishedAt' })

  if (!value) {
    return <>Auto-set on first publish if left blank.</>
  }

  const target = new Date(value)
  if (Number.isNaN(target.getTime())) return null

  const diffMs = target.getTime() - Date.now()
  if (diffMs <= 0) {
    return <>Publishes immediately on save.</>
  }

  const minute = 60_000
  const hour = 3_600_000
  const day = 86_400_000
  let when: string
  if (diffMs >= 2 * day) when = `in ${Math.round(diffMs / day)} days`
  else if (diffMs >= day) when = 'tomorrow'
  else if (diffMs >= 2 * hour) when = `in ${Math.round(diffMs / hour)} hours`
  else if (diffMs >= hour) when = 'in about an hour'
  else when = `in ${Math.max(1, Math.round(diffMs / minute))} minutes`

  return (
    <span style={{ color: 'var(--theme-success-500, var(--theme-elevation-700))' }}>
      Will publish {when} ({target.toLocaleString()}). Click Schedule Post to commit.
    </span>
  )
}

export default PublishedAtDescription
