import { type Browser, chromium, firefox, webkit } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

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

// The Navigator page's Search example mounts its own CommandPalette, which
// binds ⌘K, so it runs in a frame and the docs search keeps ⌘K (INNO-1640).
describe('Docs search beside an example that binds ⌘K', () => {
  it('opens the docs search from ⌘K and the rail, and the example its own', async () => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 }
    })
    await serveExport(context)
    const page = await context.newPage()
    const problems: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(message.text())
    })
    page.on('pageerror', (error) => problems.push(String(error)))
    await page.goto(`${ORIGIN}${BASE_PATH}/components/navigator/#search`)
    await settled(page)

    const frame = page.frameLocator('iframe[title="Example at desktop width"]')
    const exampleSearch = frame
      .locator('button[aria-keyshortcuts]')
      .filter({ hasText: 'Search' })
      .locator('visible=true')
    await exampleSearch.waitFor()

    const docsSearch = page.getByRole('dialog', { name: 'Search the docs' })
    const exampleDialog = frame.getByRole('dialog', {
      name: 'Search and commands'
    })

    await page.keyboard.press('ControlOrMeta+k')
    await docsSearch.waitFor()
    await page.keyboard.press('Escape')
    await docsSearch.waitFor({ state: 'hidden' })

    await page
      .locator('button[aria-keyshortcuts]')
      .filter({ hasText: 'Search' })
      .locator('visible=true')
      .first()
      .click()
    await docsSearch.waitFor()
    await page.keyboard.press('Escape')
    await docsSearch.waitFor({ state: 'hidden' })

    await exampleSearch.click()
    await exampleDialog.waitFor()
    expect(await docsSearch.count()).toBe(0)
    await page.keyboard.press('Escape')
    await exampleDialog.waitFor({ state: 'hidden' })

    // Focus is back on the example's Search, inside the frame.
    await page.keyboard.press('ControlOrMeta+k')
    await exampleDialog.waitFor()
    expect(await docsSearch.count()).toBe(0)

    expect(problems).toEqual([])
    await context.close()
  }, 60_000)
})
