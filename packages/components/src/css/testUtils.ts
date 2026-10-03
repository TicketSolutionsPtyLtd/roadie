import { commands } from 'vitest/browser'

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

type Point = { x: number; y: number }

// Headless WebKit on Linux runs no frames while a page sits idle, so
// requestAnimationFrame, ResizeObserver and CSS animations stall until an
// input event arrives (docs/solutions/test-failures/
// linux-webkit-no-frames-while-idle.md). Wiggles the pointer a pixel at `at()`
// until the returned function stops it.
export function keepFramesRunning(at: () => Point) {
  let running = true
  const wiggling = (async () => {
    for (let step = 0; running; step++) {
      const { x, y } = at()
      await commands.pointer([{ type: 'move', x: x + (step % 2), y }])
    }
  })()
  return async () => {
    running = false
    await wiggling
  }
}
