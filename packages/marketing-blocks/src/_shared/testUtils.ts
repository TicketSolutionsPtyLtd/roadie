import { cleanup } from '@testing-library/react'
import axe from 'axe-core'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { commands, page } from 'vitest/browser'

import roadieCss from '../../vitest.browser.css?inline'

export const PHONE = { width: 390, height: 844 } as const
export const DESKTOP = { width: 1280, height: 800 } as const

/** Gives every test in the file Roadie's stylesheet and a fresh desktop page with motion on. */
export function withBrowserPage() {
  const style = document.createElement('style')
  beforeAll(() => {
    style.textContent = roadieCss
    document.head.append(style)
  })
  afterEach(async () => {
    cleanup()
    await commands.reducedMotion(false)
    await page.viewport(1920, 1080)
  })
  afterAll(() => style.remove())
}

export async function axeViolations(element: Element) {
  const { violations } = await axe.run(element, {
    resultTypes: ['violations'],
    // Roadie measures contrast with APCA instead (docs/decisions/0010-apca-contrast.md).
    rules: { 'color-contrast': { enabled: false } }
  })
  return violations.flatMap(({ id, nodes }) =>
    nodes.map(({ html }) => `${id}: ${html}`)
  )
}
