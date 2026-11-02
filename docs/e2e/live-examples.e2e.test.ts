import { readFile, readdir } from 'fs/promises'
import { join } from 'path'
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

async function open(
  path: string,
  width: number,
  prepare?: (page: Page) => Promise<unknown>
) {
  const context = await browser.newContext({
    viewport: { width, height: 844 }
  })
  await serveExport(context)
  const page = await context.newPage()
  // Where each example sat as it mounted. Read later, a rendered example's
  // top includes every block above it that grew when it rendered.
  await page.addInitScript(() => {
    const tops: number[] = []
    Object.assign(window, { mountedTops: tops })
    new MutationObserver((records) => {
      for (const record of records)
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue
          const rendered = node.matches('[data-live-example=rendered]')
            ? [node]
            : node.querySelectorAll('[data-live-example=rendered]')
          for (const example of rendered)
            tops.push(example.getBoundingClientRect().top)
        }
    }).observe(document, { childList: true, subtree: true })
  })
  await prepare?.(page)
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
      mountedTops: (window as unknown as { mountedTops: number[] }).mountedTops,
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

/** Whether an example within the observer's reach, 150% of the docs scroller each way, is still to mount. */
const mountingInReach = (page: Page) =>
  page.evaluate(() => {
    let scroller = document.getElementById('docs-content')?.parentElement
    while (scroller && scroller.scrollHeight <= scroller.clientHeight + 1)
      scroller = scroller.parentElement
    const view = scroller?.getBoundingClientRect() ?? {
      top: 0,
      bottom: window.innerHeight,
      height: window.innerHeight
    }
    const reach = view.height * 1.5
    return [...document.querySelectorAll('[data-live-example=pending]')].some(
      (node) => {
        const { top, bottom } = node.getBoundingClientRect()
        return bottom > view.top - reach + 1 && top < view.bottom + reach - 1
      }
    )
  })

/** How far a heading sits from where a jump lands it, once no example in reach is left to mount and move it. */
const landedOffset = async (page: Page, id: string) =>
  (await mountingInReach(page))
    ? Infinity
    : Math.abs(await headingOffset(page, id))

/** The built chunk that holds LiveRunner, found by a string only it renders. */
async function liveRunnerChunk() {
  const dir = join(import.meta.dirname, '../out/_next/static/chunks')
  for (const name of await readdir(dir)) {
    if (!name.endsWith('.js')) continue
    if (
      (await readFile(join(dir, name), 'utf8')).includes('Full-width example')
    )
      return name
  }
  throw new Error('No chunk holds LiveRunner')
}

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

    // Counts would tie this to how many examples the page has and how tall
    // they are; the reach is what matters, so check positions, not totals.
    expect(onLoad.pending).toBeGreaterThan(0)
    // A screen and a half ahead of an 844px viewport (the observer's 150%
    // root margin), plus a quarter screen: an example queued in reach can be
    // pushed past it by the ones above growing as they render, and the
    // observer reports it leaving only after its turn has come.
    expect(onLoad.mountedTops).toHaveLength(onLoad.rendered)
    for (const top of onLoad.mountedTops) expect(top).toBeLessThan(844 * 2.75)

    await scrollThrough(page)
    const afterScroll = await examples(page)
    // scrollThrough waits on every screen, so each example came into view.
    expect(afterScroll).toMatchObject({
      pending: 0,
      rendered: onLoad.rendered + onLoad.pending
    })
    expect(afterScroll.inputs).toBeGreaterThan(onLoad.inputs)
    expect(await sideways(page)).toBe(false)
    expect(errors).toEqual([])
    await page.context().close()
  }, 120_000)

  it('show an error state when the runner fails to load, then load on Try again', async () => {
    const chunk = await liveRunnerChunk()
    let failing = true
    const { page } = await open('/components/number-field/', 1280, (page) =>
      page.route(`**/${chunk}`, (route) =>
        failing ? route.abort() : route.fallback()
      )
    )
    const failed = page.getByText("We couldn't load this example")

    await failed.first().waitFor()
    expect(await examples(page)).toMatchObject({ rendered: 0 })
    expect(
      await page.getByRole('heading', { name: 'Accessibility' }).count()
    ).toBe(1)

    failing = false
    await page.getByRole('button', { name: 'Try again' }).first().click()
    await page.locator('[data-live-example=rendered]').first().waitFor()
    await page.context().close()
  }, 60_000)

  it('let On this page land on a heading past every pending example', async () => {
    const { page, errors } = await open('/components/number-field/', 1280)
    const link = page
      .getByRole('navigation', { name: 'On this page' })
      .getByRole('link', { name: 'Accessibility', exact: true })
    const id = (await link.getAttribute('href'))!.slice(1)

    await link.click()

    await expect
      .poll(() => landedOffset(page, id), { timeout: 10_000 })
      .toBeLessThan(4)
    expect(errors).toEqual([])
    await page.context().close()
  }, 60_000)

  it('land a hash link from another page on its heading', async () => {
    const { page, errors } = await open('/components/badge/', 1280)
    await page.goto(
      `${ORIGIN}${BASE_PATH}/components/number-field/#accessibility`
    )
    await page.waitForLoadState('networkidle')

    await expect
      .poll(() => landedOffset(page, 'accessibility'), { timeout: 10_000 })
      .toBeLessThan(4)
    expect(errors).toEqual([])
    await page.context().close()
  }, 60_000)

  it('ignore a malformed hash', async () => {
    const { page, errors } = await open(
      '/components/number-field/#%E0%A4%A',
      1280
    )
    // The links render after the effect that reads the hash.
    await page
      .getByRole('navigation', { name: 'On this page' })
      .getByRole('link')
      .first()
      .waitFor()
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
      // The example reports rendered before NumberField's input mounts.
      await expect
        .poll(() => page.locator('[data-slot=number-field-input]').count())
        .toBe(1)
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
