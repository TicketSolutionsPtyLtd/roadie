type RegionName = [attribute: 'aria-label' | 'aria-labelledby', value: string]

/** The scroller Prose puts around a bare table. */
export const SCROLLER_CLASS = 'prose-scroll is-focusable'

const NAME_ATTRIBUTES = ['aria-label', 'aria-labelledby']
const REGION_ATTRIBUTES = ['tabindex', 'role', ...NAME_ATTRIBUTES]
const HEADINGS = ':is(h1, h2, h3, h4, h5, h6)[id]'
const ESCAPES = '.not-prose, [data-not-prose]'

// Numbering repeats needs every scroller on the page, whoever tracks it.
const tracked = new Set<HTMLElement>()

const precedes = (node: Node, other: Node) =>
  Boolean(
    node.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING
  )

const headingBefore = (scroller: Element, root: Element | Document) =>
  [...root.querySelectorAll(HEADINGS)]
    .filter((heading) => precedes(heading, scroller))
    .at(-1)

/**
 * Names a scroller by its table's caption, else the nearest heading before
 * it, else "Table". Region names must be unique, so a second table under the
 * same heading, or under none, is numbered.
 */
function regionName(scroller: HTMLElement): RegionName {
  const caption = scroller.querySelector('table')?.caption?.textContent?.trim()
  if (caption) return ['aria-label', caption]

  const root = scroller.closest('.prose') ?? scroller.ownerDocument
  const heading = headingBefore(scroller, root)
  const position = [...tracked]
    .filter(
      (other) => root.contains(other) && headingBefore(other, root) === heading
    )
    .sort((a, b) => (precedes(a, b) ? -1 : 1))
    .indexOf(scroller)
  const number = position > 0 ? position + 1 : undefined

  if (!heading) return ['aria-label', number ? `Table ${number}` : 'Table']
  return number
    ? ['aria-label', `${heading.textContent}, table ${number}`]
    : ['aria-labelledby', heading.id]
}

const scrollsInline = (scroller: HTMLElement) =>
  scroller.scrollWidth > scroller.clientWidth &&
  /auto|scroll/.test(getComputedStyle(scroller).overflowX)

/**
 * Makes `scroller` a focusable, named region while its content overflows
 * sideways, so keyboard users can reach and scroll it. Attributes the author
 * set are kept, and a scroller with its own `tabindex` is left alone.
 * Returns the cleanup.
 */
export function trackScrollRegion(scroller: HTMLElement): () => void {
  const owned = REGION_ATTRIBUTES.filter(
    (attribute) => !scroller.hasAttribute(attribute)
  )
  if (tracked.has(scroller) || !owned.includes('tabindex')) return () => {}
  tracked.add(scroller)
  const nameOwned = NAME_ATTRIBUTES.every((name) => owned.includes(name))

  const clear = () => {
    for (const attribute of owned) scroller.removeAttribute(attribute)
  }
  const update = () => {
    if (!scrollsInline(scroller)) return clear()
    scroller.setAttribute('tabindex', '0')
    if (owned.includes('role')) scroller.setAttribute('role', 'region')
    if (!nameOwned) return
    const [attribute, value] = regionName(scroller)
    for (const name of NAME_ATTRIBUTES)
      if (name !== attribute) scroller.removeAttribute(name)
    scroller.setAttribute(attribute, value)
  }

  const observer = new ResizeObserver(update)
  observer.observe(scroller)
  for (const child of scroller.children) observer.observe(child)
  return () => {
    observer.disconnect()
    clear()
    tracked.delete(scroller)
  }
}

const inside = (container: Element, node: Element, selector: string) => {
  const match = node.closest(selector)
  return match !== null && match !== container && container.contains(match)
}

function wrapBareTables(container: Element) {
  for (const table of container.querySelectorAll('table')) {
    const parent = table.parentElement
    if (
      !parent ||
      inside(container, parent, `${ESCAPES}, .prose-scroll, table`)
    )
      continue
    const scroller = table.ownerDocument.createElement('div')
    scroller.className = SCROLLER_CLASS
    if (table.classList.contains('prose-bleed'))
      scroller.classList.add('prose-bleed')
    table.before(scroller)
    scroller.append(table)
  }
}

/**
 * Tracks every `.prose-scroll` in a Prose container as its content changes.
 * With `wrapBare`, it first wraps bare tables in a scroller, which is only
 * safe for HTML React doesn't manage, such as `dangerouslySetInnerHTML`.
 */
export function observeProseScrollRegions(
  container: HTMLElement,
  wrapBare: boolean
): () => void {
  const regions = new Map<HTMLElement, () => void>()
  const sync = () => {
    if (wrapBare) wrapBareTables(container)
    const scrollers = new Set(
      [...container.querySelectorAll<HTMLElement>('.prose-scroll')].filter(
        (scroller) => !inside(container, scroller, ESCAPES)
      )
    )
    for (const [scroller, untrack] of regions) {
      if (scrollers.has(scroller)) continue
      untrack()
      regions.delete(scroller)
    }
    for (const scroller of scrollers)
      if (!regions.has(scroller))
        regions.set(scroller, trackScrollRegion(scroller))
  }

  sync()
  const observer = new MutationObserver(sync)
  observer.observe(container, { childList: true, subtree: true })
  return () => {
    observer.disconnect()
    for (const untrack of regions.values()) untrack()
  }
}
