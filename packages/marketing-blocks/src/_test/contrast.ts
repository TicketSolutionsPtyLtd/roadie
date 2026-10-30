type Rgb = [number, number, number]

let context: CanvasRenderingContext2D | null = null

// Paints each colour over the last and reads back sRGB, so oklch, color-mix
// and alpha resolve as the page stacks them. Mirrors components' contrastTestUtils.
function flatten(...layers: string[]): Rgb {
  if (!context) {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    context = canvas.getContext('2d', { willReadFrequently: true })!
  }
  context.clearRect(0, 0, 1, 1)
  for (const colour of layers) {
    context.fillStyle = '#000'
    context.fillStyle = colour
    context.fillRect(0, 0, 1, 1)
  }
  const { data } = context.getImageData(0, 0, 1, 1)
  return [data[0] ?? 0, data[1] ?? 0, data[2] ?? 0]
}

function shownFill(element: Element): Rgb {
  const fills: string[] = []
  for (let node: Element | null = element; node; node = node.parentElement)
    fills.unshift(getComputedStyle(node).backgroundColor)
  return flatten('#fff', ...fills)
}

// APCA-W3 0.0.98G (Myndex/apca-w3 SA98G). Negative is light text on dark.
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

/** The APCA Lc of an element's text over the fill it shows on, as a positive number. */
export function textContrast(element: Element): number {
  const background = shownFill(element)
  const text = flatten(
    `rgb(${background.join(' ')})`,
    getComputedStyle(element).color
  )
  return Math.abs(apcaLc(text, background))
}

/** The APCA Lc between two elements' shown fills, as a positive number: how far a control stands out from the surface behind it. */
export function fillContrast(element: Element, surface: Element): number {
  return Math.abs(apcaLc(shownFill(element), shownFill(surface)))
}

/** Roadie's APCA floors for block text (docs/decisions/0010-apca-contrast.md). */
export const MINIMUM_LC = { body: 60, large: 45 } as const

/** The least a filled control's fill should differ from the surface it sits on. */
export const MINIMUM_FILL_LC = 15

export const MODES = ['light', 'dark'] as const

export function setMode(mode: (typeof MODES)[number]) {
  document.documentElement.classList.toggle('dark', mode === 'dark')
}
