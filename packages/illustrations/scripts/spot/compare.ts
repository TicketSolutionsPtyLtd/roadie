import { chromium } from 'playwright'

export type Comparison = { name: string; changedPixels: number }

const SIZE = 384
// A channel this far apart is a real change; antialiasing along an edge stays under it.
const THRESHOLD = 96

/**
 * Renders each pair of SVGs in Chromium at 8× and counts the pixels that
 * differ, then saves a sheet of before, after, and the changes in red.
 */
export async function compare(
  pairs: { name: string; before: string; after: string }[],
  sheet: string
) {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({
      viewport: { width: 640, height: 200 }
    })
    await page.setContent(
      '<!doctype html><body style="margin:0;padding:8px;background:#3a4560;font:12px system-ui;color:#fff"></body>'
    )
    const results = await page.evaluate(
      async ({ pairs, SIZE, THRESHOLD }) => {
        const load = (svg: string) =>
          new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image(SIZE, SIZE)
            img.onload = () => resolve(img)
            img.onerror = reject
            img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace(/\s(width|height)="[^"]*"/g, ''))}`
          })
        const pixels = (img: HTMLImageElement) => {
          const ctx = new OffscreenCanvas(SIZE, SIZE).getContext('2d')!
          ctx.drawImage(img, 0, 0, SIZE, SIZE)
          return ctx.getImageData(0, 0, SIZE, SIZE).data
        }
        const out = []
        for (const { name, before, after } of pairs) {
          const [a, b] = await Promise.all([load(before), load(after)])
          const pa = pixels(a)
          const pb = pixels(b)
          const diff = new ImageData(SIZE, SIZE)
          let changedPixels = 0
          for (let i = 0; i < pa.length; i += 4) {
            let d = 0
            for (let k = 0; k < 4; k++)
              d = Math.max(d, Math.abs(pa[i + k]! - pb[i + k]!))
            const changed = d > THRESHOLD
            if (changed) changedPixels++
            diff.data.set(
              changed
                ? [255, 0, 64, 255]
                : [pa[i]!, pa[i + 1]!, pa[i + 2]!, pa[i + 3]! / 4],
              i
            )
          }
          const canvas = document.createElement('canvas')
          canvas.width = canvas.height = SIZE
          canvas.getContext('2d')!.putImageData(diff, 0, 0)
          const figure = document.createElement('figure')
          figure.style.cssText = 'margin:0 0 8px'
          figure.innerHTML = `<figcaption>${name}: ${changedPixels} pixels changed at 8×</figcaption>`
          for (const el of [a, b, canvas]) {
            el.style.cssText =
              'width:192px;height:192px;background:#5b6a8c;margin:2px'
            figure.append(el)
          }
          document.body.append(figure)
          out.push({ name, changedPixels })
        }
        return out
      },
      { pairs, SIZE, THRESHOLD }
    )
    await page.screenshot({ path: sheet, fullPage: true })
    return results as Comparison[]
  } finally {
    await browser.close()
  }
}
