export type RegionName =
  { 'aria-label': string } | { 'aria-labelledby': string }

const HEADINGS = ':is(h1, h2, h3, h4, h5, h6)[id]'

/** Names a table's scroller by its caption, else the nearest heading before it, else "Table". */
export function regionName(scroller: Element): RegionName {
  const caption = scroller
    .querySelector(':scope > table > caption')
    ?.textContent?.trim()
  if (caption) return { 'aria-label': caption }

  const root = scroller.closest('.prose') ?? scroller.ownerDocument
  const heading = [...root.querySelectorAll(HEADINGS)].findLast(
    (candidate) =>
      candidate.compareDocumentPosition(scroller) &
      Node.DOCUMENT_POSITION_FOLLOWING
  )
  return heading ? { 'aria-labelledby': heading.id } : { 'aria-label': 'Table' }
}

export const overflowsInline = (scroller: Element) =>
  scroller.scrollWidth > scroller.clientWidth
