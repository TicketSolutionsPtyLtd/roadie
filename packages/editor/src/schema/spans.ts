// The most HTML allows. Past them TableMap throws, and drawing a colgroup
// for a billion columns hangs the page.
const MOST_SPANNED = { colspan: 1000, rowspan: 65534 } as const

export type Span = keyof typeof MOST_SPANNED

export function isSpan(name: Span, span: unknown): span is number {
  return (
    Number.isInteger(span) &&
    Number(span) > 0 &&
    Number(span) <= MOST_SPANNED[name]
  )
}
