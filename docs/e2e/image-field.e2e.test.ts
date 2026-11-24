import { join } from 'path'
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

// 1280 × 850, so it passes the recipe's 1200 × 600 minimum.
const PHOTO = join(import.meta.dirname, '../public/brand/photography/08.webp')

async function open() {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  })
  await serveExport(context)
  const page = await context.newPage()
  await page.goto(`${ORIGIN}${BASE_PATH}/components/file-upload/`)
  await settled(page)
  await page.locator('#image-field').scrollIntoViewIfNeeded()
  const input = page.locator('input[name=eventImage]')
  await input.waitFor({ state: 'attached' })
  return { page, input }
}

describe('Image field recipe', () => {
  it('crops a picked image in a dialog and puts the crop in the field', async () => {
    const { page, input } = await open()
    await input.setInputFiles(PHOTO)

    const dialog = page.getByRole('dialog', { name: 'Crop event image' })
    await dialog.waitFor()
    const save = dialog.getByRole('button', { name: 'Save crop' })
    // Enabled once the image has loaded and ImageCrop reports its crop.
    await expect.poll(() => save.isEnabled()).toBe(true)
    await save.click()
    await dialog.waitFor({ state: 'hidden' })

    const preview = page.getByRole('img', { name: 'Event image: 08.jpg' })
    await preview.waitFor()
    const posted = await input.evaluate((element: HTMLInputElement) => {
      const [file] = element.files ?? []
      return file && { name: file.name, type: file.type }
    })
    expect(posted).toEqual({ name: '08.jpg', type: 'image/jpeg' })
    // The saved crop is 1200 × 600, the recipe's output width at 2:1.
    const size = await preview.evaluate(async (image: HTMLImageElement) => {
      const [file] =
        document.querySelector<HTMLInputElement>('input[name=eventImage]')
          ?.files ?? []
      const bitmap = await createImageBitmap(file!)
      return { width: bitmap.width, height: bitmap.height, alt: image.alt }
    })
    expect(size).toMatchObject({ width: 1200, height: 600 })
  })

  it('turns away an image smaller than the slot, without opening the crop', async () => {
    const { page, input } = await open()
    const small = await page.evaluate(async () => {
      const canvas = new OffscreenCanvas(800, 400)
      canvas.getContext('2d')!.fillRect(0, 0, 800, 400)
      const blob = await canvas.convertToBlob({ type: 'image/png' })
      return [...new Uint8Array(await blob.arrayBuffer())]
    })
    await input.setInputFiles({
      name: 'small.png',
      mimeType: 'image/png',
      buffer: Buffer.from(small)
    })
    await page
      .getByText(
        'small.png is 800 × 400px. Choose an image at least 1200 × 600px.'
      )
      .waitFor()
    expect(await page.getByRole('dialog').count()).toBe(0)
  })
})
