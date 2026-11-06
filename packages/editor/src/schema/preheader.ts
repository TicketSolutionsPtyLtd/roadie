// Senders pad a preheader with invisible characters so no body text shows
// after it, and the renderer adds its own. Escaped, as they're invisible; the
// combining grapheme joiner sits outside the class, as it would join to it.
const PADDING = new RegExp('[\\u200b-\\u200d\\u00ad\\ufeff]|\\u034f', 'g')

/**
 * An email's preheader as it saves: one line of text, or undefined when it
 * has none. Inboxes show it after the subject.
 */
export function preheaderOf(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const line = value.replace(PADDING, '').replace(/\s+/g, ' ').trim()
  return line === '' ? undefined : line
}
