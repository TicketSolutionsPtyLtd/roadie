import { Heading } from '@tiptap/extension-heading'

export const HEADING_LEVELS = [2, 3, 4] as const

export type HeadingLevel = (typeof HEADING_LEVELS)[number]

/** The rich preset's level for any heading: h1 reads as h2, h5 and h6 as h4. */
export function headingLevel(level: unknown): HeadingLevel {
  if (typeof level !== 'number' || !Number.isFinite(level)) return 2
  return Math.min(4, Math.max(2, Math.trunc(level))) as HeadingLevel
}

// The page owns h1, so pasted h1 becomes h2 and h5 and h6 become h4.
export const RichHeading = Heading.extend({
  addAttributes() {
    return { level: { default: 2, rendered: false } }
  },
  parseHTML() {
    return [1, 2, 3, 4, 5, 6].map((level) => ({
      tag: `h${level}`,
      attrs: { level: headingLevel(level) }
    }))
  }
}).configure({ levels: [2, 3, 4] })
