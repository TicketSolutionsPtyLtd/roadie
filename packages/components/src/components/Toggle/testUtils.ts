import type { BrowserCommands } from 'vitest/browser'
import { userEvent } from 'vitest/browser'

/**
 * The sheet with nesting lowered as Next's build lowers it, where an :is()
 * once outranked hover, and transitions off, to read a fill, not a frame of it.
 */
export async function settledStylesheet(
  commands: BrowserCommands,
  css: string
) {
  return `${await commands.lowerNesting(css)} * { transition: none !important; }`
}

export async function hoverFill(element: HTMLElement) {
  const rest = getComputedStyle(element).backgroundColor
  await userEvent.hover(element)
  const hovered = getComputedStyle(element).backgroundColor
  await userEvent.unhover(element)
  return { rest, hovered }
}
