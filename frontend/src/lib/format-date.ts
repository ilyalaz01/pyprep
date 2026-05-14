/**
 * Shared date formatters. Browser-native (Intl), no date library.
 * Forced en-US for MVP-1 stability — i18n is post-MVP.
 */

/** ISO YYYY-MM-DD → "Mon D" (e.g. "May 5"). UTC-anchored. */
export function formatShortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

/** ISO YYYY-MM-DD → "May" (3-letter month). UTC-anchored. */
export function formatShortMonth(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  return d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
}
