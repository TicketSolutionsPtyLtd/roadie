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

/** A cell's span as the schema saves it, reading any span HTML can't hold as 1. */
export function spanAttribute(name: Span) {
  return {
    default: 1,
    parseHTML: (element: HTMLElement) => {
      const span = Number(element.getAttribute(name))
      return isSpan(name, span) ? span : 1
    }
  }
}
