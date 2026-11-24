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

describe('the OTP field page’s send a new code example', () => {
  it('counts down, offers a new code, and waits again after sending', async () => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    })
    await serveExport(context)
    const page = await context.newPage()
    // The page's own time, so the wait passes without waiting.
    await page.clock.install()
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(String(error)))
    await page.goto(
      `${ORIGIN}${BASE_PATH}/components/otp-field#send-a-new-code`
    )
    await settled(page)

    const example = page
      .locator('[data-live-example=rendered]')
      // Two other examples on the page also say "We sent a code to".
      .filter({ hasText: 'sam@example.com' })
    const wait = example.getByText('Send a new code in')
    const send = example.getByRole('button', { name: 'Send a new code' })
    await wait.scrollIntoViewIfNeeded()
    await expect.poll(() => wait.isVisible()).toBe(true)
    expect(await send.count()).toBe(0)

    await page.clock.runFor(11_000)
    await expect.poll(() => send.isVisible()).toBe(true)
    expect(await wait.count()).toBe(0)

    await send.click()
    expect(await send.getAttribute('aria-busy')).toBe('true')
    await page.clock.runFor(2_000)
    await expect.poll(() => wait.isVisible()).toBe(true)
    // The button went, so focus moved to the first slot for the new code.
    expect(
      await example.evaluate((node) =>
        node
          .querySelector('[data-slot=otp-field-input]')
          ?.isSameNode(document.activeElement)
      )
    ).toBe(true)
    expect(errors).toEqual([])
    await context.close()
  })
})
