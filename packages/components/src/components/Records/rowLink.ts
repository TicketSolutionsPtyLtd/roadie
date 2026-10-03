const INTERACTIVE =
  'a, button, input, select, textarea, label, [role="checkbox"], [role="menuitem"], [tabindex], [data-row-control]'

/**
 * A row click toggles a selectable row, or else follows the row's link,
 * unless it landed on a control of its own. Cmd, Ctrl and middle clicks
 * always open the link in a new tab.
 */
export function handleRowClick(
  event: MouseEvent,
  row: HTMLElement,
  select?: (range: boolean) => void
) {
  // Right click, back/forward buttons: never navigate. Middle click is handled below.
  if (event.button > 1) return
  const target = event.target as Node
  // A portalled node (a menu's content) bubbles through React's tree but
  // never lands inside the row's real DOM.
  if (!row.contains(target)) return
  const control = (target as Element).closest?.(INTERACTIVE)
  // Bounded to the row: the sideways scroller around it is itself focusable.
  if (control && row.contains(control)) return
  const selection = window.getSelection()
  // A text selection means the person was copying, not navigating.
  if (selection && !selection.isCollapsed && selection.containsNode(row, true))
    return
  const link = row.querySelector<HTMLAnchorElement>('[data-row-link]')
  const newTab = event.metaKey || event.ctrlKey || event.button === 1
  if (select && !newTab) {
    if (event.button === 0) select(event.shiftKey)
    return
  }
  if (!link) return
  if (newTab || event.shiftKey) {
    const external = link.target === '_blank'
    window.open(
      link.href,
      '_blank',
      external ? 'noopener,noreferrer' : 'noopener'
    )
    return
  }
  link.click()
}
