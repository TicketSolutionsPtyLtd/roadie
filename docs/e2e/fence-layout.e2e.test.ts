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

async function open(path: string, width = 1280) {
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

/** The first live example after a heading, scrolled into view and rendered. */
async function exampleAfter(page: Page, headingId: string) {
  const block = page
    .locator(`#${headingId}`)
    .locator(
      'xpath=following-sibling::*[.//*[@data-live-example]][1]//*[@data-live-example]/..'
    )
  await block.scrollIntoViewIfNeeded()
  await block.locator('[data-live-example=rendered]').waitFor()
  return block
}

/** The element react-live renders the example into, which the layout options style. */
const previewOf = (block: Awaited<ReturnType<typeof exampleAfter>>) =>
  block.locator('[data-live-example=rendered] > div')

const styleOf = (preview: ReturnType<typeof previewOf>) =>
  preview.evaluate((node) => {
    const style = getComputedStyle(node)
    return {
      display: style.display,
      flexWrap: style.flexWrap,
      alignItems: style.alignItems,
      rowGap: style.rowGap,
      columnGap: style.columnGap,
      maxWidth: style.maxWidth,
      children: node.children.length
    }
  })

async function codeOf(block: Awaited<ReturnType<typeof exampleAfter>>) {
  const viewCode = block.getByRole('button', { name: 'View code' })
  if (await viewCode.count()) await viewCode.click()
  return block.locator('pre[contenteditable]').textContent()
}

describe('fence layout options', () => {
  it('lay out a layout=row fence as a wrapping row, and copy only the badges', async () => {
    const { page, errors } = await open('/components/badge/')
    const block = await exampleAfter(page, 'emphasis')

    expect(await styleOf(previewOf(block))).toMatchObject({
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      columnGap: '8px',
      children: 4
    })
    const code = await codeOf(block)
    expect(code?.trimStart().startsWith("<Badge emphasis='strong'>")).toBe(true)
    expect(code).not.toContain('className=')
    expect(errors).toEqual([])
    await page.context().close()
  }, 60_000)

  it('caption each state in a layout=stack gap=6 fence, and copy captions as comments', async () => {
    const { page, errors } = await open('/components/accordion/')
    const block = await exampleAfter(page, 'emphasis')
    const preview = previewOf(block)

    expect(await styleOf(preview)).toMatchObject({
      display: 'grid',
      rowGap: '24px',
      children: 3
    })
    const cells = await preview.evaluate((node) =>
      [...node.children].map((cell) => {
        const [caption, accordion] = [...cell.children] as [Element, Element]
        return {
          caption: caption.textContent,
          captionSize: getComputedStyle(caption).fontSize,
          escapesProse: caption.hasAttribute('data-not-prose'),
          captionAbove:
            caption.getBoundingClientRect().bottom <=
            accordion.getBoundingClientRect().top,
          gap:
            accordion.getBoundingClientRect().top -
            caption.getBoundingClientRect().bottom,
          fullWidth:
            Math.abs(
              accordion.getBoundingClientRect().width -
                node.getBoundingClientRect().width
            ) < 1
        }
      })
    )
    expect(cells.map(({ caption }) => caption)).toEqual([
      'Normal',
      'Subtle',
      'Subtler'
    ])
    for (const cell of cells) {
      expect(cell).toMatchObject({
        captionSize: '14px',
        escapesProse: true,
        captionAbove: true,
        gap: 4,
        fullWidth: true
      })
    }

    const code = await codeOf(block)
    expect(code?.split('\n')[0]).toBe('{/* Normal */}')
    expect(code).not.toContain('<div')
    expect(code).not.toContain('PreviewCell')
    expect(errors).toEqual([])
    await page.context().close()
  }, 60_000)

  it('wrap several elements under one caption in a row', async () => {
    const { page, errors } = await open('/components/button/')
    const block = await exampleAfter(page, 'intents')
    const groups = await previewOf(block).evaluate((node) =>
      [...node.children].map((cell) => {
        const [caption, row] = [...cell.children] as [Element, Element]
        const style = getComputedStyle(row)
        return {
          caption: caption.textContent,
          display: style.display,
          flexWrap: style.flexWrap,
          columnGap: style.columnGap,
          buttons: row.querySelectorAll('button').length
        }
      })
    )

    expect(groups.map(({ caption }) => caption)).toEqual([
      'Strong',
      'Normal',
      'Subtle',
      'Subtler'
    ])
    for (const group of groups) {
      expect(group).toMatchObject({
        display: 'flex',
        flexWrap: 'wrap',
        columnGap: '8px',
        buttons: 7
      })
    }
    expect(errors).toEqual([])
    await page.context().close()
  }, 60_000)

  it('frame a width=md chart at 35rem, with only the chart to copy', async () => {
    const { page, errors } = await open('/charts/bar-chart/', 1920)
    const block = await exampleAfter(page, 'default')
    const preview = previewOf(block)

    expect(await styleOf(preview)).toMatchObject({ maxWidth: '560px' })
    const { width, room } = await preview.evaluate((node) => {
      const parent = getComputedStyle(node.parentElement!)
      return {
        width: node.getBoundingClientRect().width,
        room:
          node.parentElement!.clientWidth -
          parseFloat(parent.paddingLeft) -
          parseFloat(parent.paddingRight)
      }
    })
    expect(room).toBeGreaterThan(560)
    expect(width).toBe(560)
    expect((await codeOf(block))?.trimStart()).toMatch(/^<Chart /)
    expect(errors).toEqual([])
    await page.context().close()
  }, 60_000)

  it('keep the layout on the example page of its own', async () => {
    const { page, errors } = await open('/examples/components/badge/emphasis/')
    const preview = page.locator('[data-live-example=rendered] > div')
    await preview.waitFor()

    expect(await styleOf(preview)).toMatchObject({
      display: 'flex',
      columnGap: '8px',
      children: 4
    })
    expect(errors).toEqual([])
    await page.context().close()
  }, 60_000)

  it.skipIf(!BASE_PATH)(
    'load plain asset URLs in fences under the base path',
    async () => {
      const { page, errors } = await open('/components/record-grid/')
      const block = await exampleAfter(page, 'default')
      const image = block.locator('[data-live-example=rendered] img').first()
      await image.waitFor()
      await expect
        .poll(() => image.evaluate((node: HTMLImageElement) => node.complete))
        .toBe(true)

      expect(await image.getAttribute('src')).toBe(
        `${BASE_PATH}/cart-demo-event.svg`
      )
      expect(
        await image.evaluate((node: HTMLImageElement) => node.naturalWidth)
      ).toBeGreaterThan(0)
      expect(await codeOf(block)).toContain(
        "image: index % 5 === 4 ? undefined : '/cart-demo-event.svg'"
      )
      expect(errors).toEqual([])
      await page.context().close()
    },
    60_000
  )
})
