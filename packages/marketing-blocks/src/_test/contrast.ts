// The APCA measurement from packages/components/src/css/contrastTestUtils.ts,
// which this package can't import: its tsconfig's rootDir is src.
type Rgb = [number, number, number]

let context: CanvasRenderingContext2D | null = null

function pixel() {
  if (!context) {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    context = canvas.getContext('2d', { willReadFrequently: true })!
  }
  return context
}

// Paints each colour over the last, as the page stacks them, and reads back
// the sRGB result, so oklch, color-mix and alpha all resolve the same way.
function flatten(...layers: string[]): Rgb {
  const ctx = pixel()
  ctx.clearRect(0, 0, 1, 1)
  for (const colour of layers) {
    ctx.fillStyle = '#000'
    ctx.fillStyle = colour
    ctx.fillRect(0, 0, 1, 1)
  }
  const { data } = ctx.getImageData(0, 0, 1, 1)
  return [data[0] ?? 0, data[1] ?? 0, data[2] ?? 0]
}

function shownFill(element: Element): Rgb {
  const fills: string[] = []
  for (let node: Element | null = element; node; node = node.parentElement)
    fills.unshift(getComputedStyle(node).backgroundColor)
  return flatten('#fff', ...fills)
}

// APCA-W3 0.0.98G, constants as published in Myndex/apca-w3 (SA98G).
function apcaLc(text: Rgb, background: Rgb) {
  const screenY = ([r, g, b]: Rgb) => {
    const y =
      0.2126729 * (r / 255) ** 2.4 +
      0.7151522 * (g / 255) ** 2.4 +
      0.072175 * (b / 255) ** 2.4
    return y < 0.022 ? y + (0.022 - y) ** 1.414 : y
  }
  const textY = screenY(text)
  const backgroundY = screenY(background)
  if (Math.abs(backgroundY - textY) < 0.0005) return 0
  if (backgroundY > textY) {
    const sapc = (backgroundY ** 0.56 - textY ** 0.57) * 1.14
    return sapc < 0.1 ? 0 : (sapc - 0.027) * 100
  }
  const sapc = (backgroundY ** 0.65 - textY ** 0.62) * 1.14
  return sapc > -0.1 ? 0 : (sapc + 0.027) * 100
}

/** The APCA Lc, unsigned, of an element's text over the fills behind it. */
export function textContrast(element: Element) {
  const background = shownFill(element)
  const text = flatten(
    `rgb(${background.join(' ')})`,
    getComputedStyle(element).color
  )
  return Math.abs(apcaLc(text, background))
}

/** APCA's minimum Lc for body text and for large text (docs/decisions/0010-apca-contrast.md). */
export const MINIMUM_LC = { body: 60, large: 45 } as const

export const themes = ['light', 'dark'] as const
