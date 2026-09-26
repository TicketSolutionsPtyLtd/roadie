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
export function flatten(...layers: string[]): Rgb {
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

function linear(channel: number) {
  const c = channel / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function luminance([r, g, b]: Rgb) {
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

export function contrast(a: Rgb, b: Rgb) {
  const [x, y] = [luminance(a), luminance(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

// The colour an element shows: its own fill over every ancestor's.
export function shownFill(element: Element): Rgb {
  const fills: string[] = []
  for (let node: Element | null = element; node; node = node.parentElement) {
    fills.unshift(getComputedStyle(node).backgroundColor)
  }
  return flatten('#fff', ...fills)
}

export function over(base: Rgb, colour: string): Rgb {
  return flatten(`rgb(${base.join(' ')})`, colour)
}
