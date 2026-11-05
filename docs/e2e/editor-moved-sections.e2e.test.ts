import { type Browser, chromium, firefox, webkit } from 'playwright'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

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

describe('old Editor page anchors', () => {
  it.each(['merge-tags', 'html-emails'])(
    'sends #%s to the Email page',
    async (anchor) => {
      const context = await browser.newContext()
      await serveExport(context)
      const page = await context.newPage()
      await page.goto(`${ORIGIN}${BASE_PATH}/components/editor/#${anchor}`)
      const moved = `${ORIGIN}${BASE_PATH}/components/editor/email/#${anchor}`
      await page.waitForURL(moved)
      expect(page.url()).toBe(moved)
      await expect
        .poll(() => page.locator(`[id="${anchor}"]`).count())
        .toBeGreaterThan(0)
    }
  )
})
