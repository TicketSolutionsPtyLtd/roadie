import { type Browser, type Page, chromium, firefox, webkit } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

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

async function open(path: string, width: number) {
  const context = await browser.newContext({
    viewport: { width, height: 844 }
  })
  await serveExport(context)
  const page = await context.newPage()
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(String(error)))
  await page.goto(`${ORIGIN}${BASE_PATH}${path}`)
  await page.waitForLoadState('networkidle')
  return { page, errors }
}

const examples = (page: Page) =>
  page.evaluate(() => {
    const nodes = [...document.querySelectorAll('[data-live-example]')]
    return {
      rendered: nodes.filter((node) =>
        node.matches('[data-live-example=rendered]')
      ).length,
      pending: nodes.filter((node) =>
        node.matches('[data-live-example=pending]')
      ).length,
      renderedTops: nodes
        .filter((node) => node.matches('[data-live-example=rendered]'))
        .map((node) => node.getBoundingClientRect().top),
      inputs: document.querySelectorAll('[data-slot=number-field-input]').length
    }
  })

/** Scrolls the docs column to the end a screen at a time, waiting at each screen until every example on it renders. */
async function scrollThrough(page: Page) {
  for (let step = 0; step < 200; step++) {
    const atEnd = await page.evaluate(() => {
      let scroller = document.getElementById('docs-content')?.parentElement
      while (scroller && scroller.scrollHeight <= scroller.clientHeight + 1)
        scroller = scroller.parentElement
      const target = scroller ?? document.scrollingElement!
      target.scrollTop += target.clientHeight
      return target.scrollTop + target.clientHeight >= target.scrollHeight - 1
    })
    await page.waitForFunction(() =>
      [...document.querySelectorAll('[data-live-example=pending]')].every(
        (node) => {
          const { top, bottom } = node.getBoundingClientRect()
          return bottom < 0 || top > window.innerHeight
        }
      )
    )
    if (atEnd) return
  }
}

/** How far a heading sits from where a jump should land it: its scroller's top, past scroll-padding and scroll-margin. */
const headingOffset = (page: Page, id: string) =>
  page.evaluate((id) => {
    const heading = document.getElementById(id)!
    let scroller = heading.parentElement
    while (scroller && scroller.scrollHeight <= scroller.clientHeight + 1)
      scroller = scroller.parentElement
    const target = scroller ?? document.documentElement
    const padding = parseFloat(getComputedStyle(target).scrollPaddingTop) || 0
    const margin = parseFloat(getComputedStyle(heading).scrollMarginTop) || 0
    const top = scroller ? target.getBoundingClientRect().top : 0
    return heading.getBoundingClientRect().top - top - padding - margin
  }, id)

const sideways = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth
  )

describe('live examples', () => {
  it('render only near the viewport on the number field page, then on scroll', async () => {
    const { page, errors } = await open('/components/number-field/', 390)
    const onLoad = await examples(page)

    expect(onLoad.pending).toBeGreaterThan(8)
    // A screen and a half ahead of an 844px viewport (the observer's 150%
    // root margin), plus the example straddling it.
    for (const top of onLoad.renderedTops)
      expect(top).toBeLessThan(844 * 2.5 + 50)

    await scrollThrough(page)
    const afterScroll = await examples(page)
    // Examples scrolled past before their turn wait until they're back in reach.
    expect(afterScroll.rendered).toBeGreaterThan(onLoad.rendered + 8)
    expect(afterScroll.inputs).toBeGreaterThan(onLoad.inputs)
    expect(await sideways(page)).toBe(false)
    expect(errors).toEqual([])
    await page.context().close()
  }, 120_000)

  it('let On this page land on a heading past every pending example', async () => {
    const { page, errors } = await open('/components/number-field/', 1280)
    const link = page
      .getByRole('navigation', { name: 'On this page' })
      .getByRole('link', { name: 'Accessibility', exact: true })
    const id = (await link.getAttribute('href'))!.slice(1)

    await link.click()
    await page.waitForTimeout(3000)

    expect(Math.abs(await headingOffset(page, id))).toBeLessThan(4)
    expect(errors).toEqual([])
    await page.context().close()
  }, 60_000)

  it('land a hash link from another page on its heading', async () => {
    const { page, errors } = await open('/components/badge/', 1280)
    await page.goto(
      `${ORIGIN}${BASE_PATH}/components/number-field/#accessibility`
    )
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    expect(Math.abs(await headingOffset(page, 'accessibility'))).toBeLessThan(4)
    expect(errors).toEqual([])
    await page.context().close()
  }, 60_000)

  it('ignore a malformed hash', async () => {
    const { page, errors } = await open(
      '/components/number-field/#%E0%A4%A',
      1280
    )
    await page.waitForTimeout(1000)

    expect(
      await page
        .getByRole('navigation', { name: 'On this page' })
        .getByRole('link')
        .count()
    ).toBeGreaterThan(0)
    expect(errors).toEqual([])
    await page.context().close()
  }, 60_000)

  it('keep code edits when the code is hidden and shown again', async () => {
    const { page } = await open('/components/number-field/', 1280)
    const blocks = page.locator('[data-live-example]').locator('..')
    const collapsible = await blocks.evaluateAll((nodes) =>
      nodes.findIndex((node) =>
        [...node.querySelectorAll('button')].some(
          (button) => button.textContent === 'View code'
        )
      )
    )
    const block = blocks.nth(collapsible)
    await block.scrollIntoViewIfNeeded()
    await block.locator('[data-live-example=rendered]').waitFor()
    await block.getByRole('button', { name: 'View code' }).click()
    const editor = block.locator('pre[contenteditable]')
    await editor.click()
    await page.keyboard.press('ControlOrMeta+End')
    await page.keyboard.type('\n// kept edit')

    await block.getByRole('button', { name: 'Hide code' }).click()
    await block.getByRole('button', { name: 'View code' }).click()

    expect(await editor.textContent()).toContain('// kept edit')
    await page.context().close()
  }, 60_000)

  for (const width of [390, 1280]) {
    it(`open alone on their own page at ${width}px`, async () => {
      const { page, errors } = await open(
        '/examples/components/number-field/default/',
        width
      )

      expect(await examples(page)).toMatchObject({ rendered: 1, pending: 0 })
      expect(await page.locator('[data-slot=number-field-input]').count()).toBe(
        1
      )
      expect(await page.locator('[data-slot=navigator]').count()).toBe(0)
      expect(
        await page
          .getByRole('link', { name: 'Number field' })
          .getAttribute('href')
      ).toBe(`${BASE_PATH}/components/number-field/#default`)
      expect(await sideways(page)).toBe(false)
      expect(errors).toEqual([])
      await page.context().close()
    }, 60_000)
  }

  it('give examples the live scope on their own page', async () => {
    const { page, errors } = await open(
      '/examples/components/button/download/',
      1280
    )

    expect(
      await page
        .getByRole('link', { name: 'Download logo' })
        .getAttribute('href')
    ).toBe(`${BASE_PATH}/roadie-logo.png`)
    expect(errors).toEqual([])
    await page.context().close()
  }, 60_000)

  it('link each example to its own page', async () => {
    const { page } = await open('/components/badge/', 1280)
    const link = page
      .getByRole('link', { name: 'Open example in a new tab' })
      .first()

    expect(await link.getAttribute('href')).toBe(
      `${BASE_PATH}/examples/components/badge/default/`
    )
    expect(await link.getAttribute('target')).toBe('_blank')
    await page.context().close()
  }, 60_000)
})
