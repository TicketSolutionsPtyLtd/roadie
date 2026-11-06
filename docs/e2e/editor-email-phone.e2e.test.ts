import { type Browser, chromium, firefox, webkit } from 'playwright'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { settled } from './routerReady'
import { BASE_PATH, ORIGIN, serveExport } from './serveExport'

let browser: Browser

beforeAll(async () => {
  const engines = { chromium, firefox, webkit }
  const engine = (process.env.E2E_BROWSER ?? 'chromium') as keyof typeof engines
  browser = await engines[engine].launch()
})

afterAll(async () => {
  await browser?.close()
})

afterEach(async () => {
  await Promise.all(browser.contexts().map((context) => context.close()))
})

// A phone sends the email at the screen's width with its text 24px in from
// each side, so the canvas's text is as wide on the example's own page.
describe('the email example on a phone', () => {
  it('sets its text as wide as the sent email’s, at 390px', async () => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 }
    })
    await serveExport(context)
    const page = await context.newPage()
    await page.goto(
      `${ORIGIN}${BASE_PATH}/examples/components/editor/email/default/`
    )
    await settled(page)
    const footer = page.getByText('You’re getting this email because')
    await footer.waitFor()

    const width = await footer.evaluate(
      (line) => line.getBoundingClientRect().width
    )
    expect(width).toBeCloseTo(390 - 2 * 24, 0)
    expect(
      await page.evaluate(() => document.scrollingElement!.scrollWidth)
    ).toBeLessThanOrEqual(390)
  })
})
