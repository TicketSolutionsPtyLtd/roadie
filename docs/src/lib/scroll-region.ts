export type RegionName =
  { 'aria-label': string } | { 'aria-labelledby': string }

const HEADINGS = ':is(h1, h2, h3, h4, h5, h6)[id]'

const headingBefore = (scroller: Element, root: ParentNode) =>
  [...root.querySelectorAll(HEADINGS)].findLast(
    (candidate) =>
      candidate.compareDocumentPosition(scroller) &
      Node.DOCUMENT_POSITION_FOLLOWING
  )

/**
 * Names a table's scroller by its caption, else the nearest heading before
 * it, else "Table". Region names must be unique, so a second table under the
 * same heading, or under none, is numbered.
 */
export function regionName(scroller: Element): RegionName {
  const caption = scroller
    .querySelector(':scope > table > caption')
    ?.textContent?.trim()
  if (caption) return { 'aria-label': caption }

  const root = scroller.closest('.prose') ?? scroller.ownerDocument
  const heading = headingBefore(scroller, root)
  const position = [...root.querySelectorAll('.prose-scroll')]
    .filter((other) => headingBefore(other, root) === heading)
    .indexOf(scroller)
  const number = position > 0 ? position + 1 : undefined

  if (!heading) return { 'aria-label': number ? `Table ${number}` : 'Table' }
  return number
    ? { 'aria-label': `${heading.textContent}, table ${number}` }
    : { 'aria-labelledby': heading.id }
}

export const overflowsInline = (scroller: Element) =>
  scroller.scrollWidth > scroller.clientWidth
