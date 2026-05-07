/**
 * Custom Publish button that flips its label to "Schedule Post" when
 * the editor has set a future `publishedAt`. Reads form state via
 * `useField` (live), submits via `useForm`'s `submit` with a `_status:
 * 'published'` override (same path Payload's default PublishButton uses).
 *
 * Coupling surface (smoke-test on Payload upgrades):
 *   - `useField`, `useForm`, `Button` exports from `@payloadcms/ui`
 *   - `submit({ overrides: { _status: ... } })` form action shape
 *   - `admin.components.edit.PublishButton` slot in collection config
 */
'use client'
import { Button, useField, useForm, useFormProcessing, useTranslation } from '@payloadcms/ui'

const SchedulePublishButton = () => {
  const { value: publishedAt } = useField<string | null | undefined>({ path: 'publishedAt' })
  const { submit } = useForm()
  const processing = useFormProcessing()
  const { t } = useTranslation<Record<string, string>, string>()

  const isScheduled = !!publishedAt && new Date(publishedAt).getTime() > Date.now()

  const handlePublish = () => {
    void submit({
      overrides: {
        _status: 'published',
      },
    })
  }

  // Fall back to Payload's i18n for the default label so it follows the
  // user's admin language.
  const defaultLabel =
    typeof t === 'function' ? t('version:publishChanges') || 'Publish changes' : 'Publish changes'

  return (
    <Button
      buttonStyle="primary"
      disabled={Boolean(processing)}
      onClick={handlePublish}
      size="medium"
      type="button"
    >
      {processing ? '…' : isScheduled ? 'Schedule Post' : defaultLabel}
    </Button>
  )
}

export default SchedulePublishButton
