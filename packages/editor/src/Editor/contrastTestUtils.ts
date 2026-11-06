type Rgb = [number, number, number]

let context: CanvasRenderingContext2D | null = null

// Paints each colour over the last, as the page stacks them, and reads back
// the sRGB result, so oklch, color-mix and alpha all resolve the same way.
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

/** The fill an element shows: its own over every ancestor's. */
export function shownFill(element: Element): Rgb {
  const fills: string[] = []
  for (let node: Element | null = element; node; node = node.parentElement) {
    fills.unshift(getComputedStyle(node).backgroundColor)
  }
  return flatten('#fff', ...fills)
}

/** An element's text colour, over the fill it shows on. */
export function shownText(element: Element): Rgb {
  return flatten(
    `rgb(${shownFill(element).join(' ')})`,
    getComputedStyle(element).color
  )
}

// APCA-W3 0.0.98G, as the components package measures it. Negative is light
// text on dark.
export function apcaLc(text: Rgb, background: Rgb) {
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
