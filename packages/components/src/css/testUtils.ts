import { commands, userEvent } from 'vitest/browser'

const HOVER = '(hover: hover)'
const NO_HOVER = 'not (hover: hover)'

function hoverGates(rules: CSSRuleList, found: CSSMediaRule[] = []) {
  for (const rule of Array.from(rules)) {
    if (
      rule instanceof CSSMediaRule &&
      [HOVER, NO_HOVER].includes(rule.conditionText)
    )
      found.push(rule)
    if ('cssRules' in rule)
      hoverGates((rule as CSSGroupingRule).cssRules, found)
  }
  return found
}

let gates: { rule: CSSMediaRule; hover: boolean }[] = []

// Playwright can't emulate a device without hover, so each hover gate is
// pinned to match or not, as a touch screen would decide it. Call after the
// stylesheets are in the document.
export function setHoverCapable(capable: boolean) {
  if (!gates.some(({ rule }) => rule.parentStyleSheet?.ownerNode?.isConnected))
    gates = Array.from(document.styleSheets)
      .flatMap((sheet) => hoverGates(sheet.cssRules))
      .map((rule) => ({ rule, hover: rule.conditionText === HOVER }))
  for (const { rule, hover } of gates)
    rule.media.mediaText = hover === capable ? 'all' : 'not all'
}

// Wakes rendering with a pointer move, then waits two frames, so scroll events
// the page has queued and the frame callbacks they request have run. Two
// points, so the pointer really moves wherever it was.
export async function nudgeFrames() {
  await commands.pointer([
    { type: 'move', x: 1, y: 0 },
    { type: 'move', x: 0, y: 0 }
  ])
  await new Promise(requestAnimationFrame)
  await new Promise(requestAnimationFrame)
}

// A native drag leaves Linux WebKit counting the mouse as pressed for the whole
// page, so the next press, even in a later test file, fires no pointerdown. A
// press and release in the corner clears it.
export async function releaseDragPointer() {
  await commands.pointer([
    { type: 'move', x: 0, y: 0 },
    { type: 'down' },
    { type: 'up' }
  ])
}

export function focusRing(element: Element) {
  const style = getComputedStyle(element)
  return {
    style: style.outlineStyle,
    width: style.outlineWidth,
    color: style.outlineColor,
    offset: style.outlineOffset
  }
}

/** Script focus straight after a key press, which every engine shows as :focus-visible. */
export async function focusAfterKey<T extends HTMLElement | SVGElement>(
  target: T
) {
  await userEvent.keyboard('{Shift}')
  target.focus()
  if (!target.matches(':focus-visible'))
    throw new Error('Focus did not become :focus-visible')
  return target
}

/** The ring the base styles draw on a plain link with no Roadie class. */
export async function plainLinkRing(within: Element = document.body) {
  const link = document.createElement('a')
  link.href = '#tickets'
  link.textContent = 'Tickets'
  within.append(link)
  await focusAfterKey(link)
  const ring = focusRing(link)
  link.remove()
  return ring
}
