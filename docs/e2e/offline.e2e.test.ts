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

// A request to a CDN holds the load event until it answers, so one slow
// response timed out page.goto. Port 9 refuses connections, so anything
// serveExport doesn't fulfil fails here at once.
async function openOffline(route: string) {
  const context = await browser.newContext({
    proxy: { server: 'http://127.0.0.1:9' }
  })
  await serveExport(context)
  const page = await context.newPage()
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  const fonts: string[] = []
  page.on('request', (request) => {
    if (request.resourceType() === 'font') fonts.push(request.url())
  })
  await page.goto(`${ORIGIN}${BASE_PATH}${route}/`)
  await settled(page)
  return { page, errors, fonts }
}

describe('pages under test, with no network', () => {
  // A font fetched through a route came late enough under load for Firefox
  // to cancel it and log the failure, so the fonts arrive inlined.
  it('render in Intermission and IBM Plex Mono, fetching neither', async () => {
    const { page, fonts } = await openOffline('/foundations/typography')
    const statuses = await page.evaluate(async () => {
      const faces = [
        '16px Intermission',
        'italic 16px Intermission',
        '16px "IBM Plex Mono"'
      ]
      await Promise.allSettled(faces.map((face) => document.fonts.load(face)))
      return [...document.fonts].map(
        (face) => `${face.family} ${face.style} ${face.status}`
      )
    })
    expect(statuses.sort()).toEqual([
      'IBM Plex Mono normal loaded',
      'Intermission italic loaded',
      'Intermission normal loaded'
    ])
    expect(fonts).toEqual([])
  })

  it('show example images from the CDN', async () => {
    const { page, errors } = await openOffline('/debug/prose')
    const images = page.locator('img[src^="https://assets.oztix.com.au/"]')
    await expect.poll(() => images.count()).toBeGreaterThan(0)
    const widths = await images.evaluateAll((all) =>
      (all as HTMLImageElement[]).map((image) => image.naturalWidth)
    )
    expect(widths.every((width) => width > 0)).toBe(true)
    expect(errors).toEqual([])
  })
})
