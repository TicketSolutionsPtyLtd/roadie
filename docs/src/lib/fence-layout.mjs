// Plain ESM with no dependencies: the remark plugin, LiveRunner, and the ESLint
// config all import it.

const LAYOUTS = {
  stack: { className: 'grid', gap: '4' },
  row: { className: 'flex flex-wrap items-center', gap: '2' }
}

// Literal class names, so Tailwind finds them in this file.
const GAPS = {
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  6: 'gap-6',
  8: 'gap-8'
}

// Tailwind spacing steps, the width frames the docs' fences use most.
const WIDTHS = {
  40: 'max-w-40',
  48: 'max-w-48',
  64: 'max-w-64',
  72: 'max-w-72',
  80: 'max-w-80',
  140: 'max-w-140',
  180: 'max-w-180'
}

const LAYOUT_KEYS = ['layout', 'gap', 'width']

const CAPTION = /^\{\/\*\s*(.*?)\s*\*\/\}\s*$/

const oneOf = (key, value, allowed) => {
  if (value !== undefined && !Object.hasOwn(allowed, value)) {
    throw new Error(
      `Fence option ${key}=${value} must be one of ${Object.keys(allowed).join(', ')}`
    )
  }
  return value
}

/** The preview's layout classes from fence meta words, or undefined when the fence sets none. */
export function previewLayoutOf(words) {
  const options = Object.fromEntries(
    LAYOUT_KEYS.map((key) => [
      key,
      words.find((word) => word.startsWith(`${key}=`))?.slice(key.length + 1)
    ])
  )
  const layout = oneOf('layout', options.layout, LAYOUTS)
  const gap = oneOf('gap', options.gap, GAPS)
  const width = oneOf('width', options.width, WIDTHS)
  if (gap !== undefined && layout === undefined) {
    throw new Error(`Fence option gap=${gap} needs layout=stack or layout=row`)
  }
  const classes = [
    layout && LAYOUTS[layout].className,
    layout && GAPS[gap ?? LAYOUTS[layout].gap],
    width && WIDTHS[width]
  ].filter(Boolean)
  return classes.length > 0 ? classes.join(' ') : undefined
}

/** Labels from caption comments, `{/* Normal *\/}` on a line of its own at column 0. */
export const captionsOf = (code) =>
  code
    .split('\n')
    .map((line) => CAPTION.exec(line)?.[1])
    .filter((label) => label !== undefined)

/** False for a fence that renders a function component, which isn't JSX at its root. */
export const startsWithJsx = (code) => /^\s*[<{]/.test(code)

/**
 * The code react-live runs for an inline fence the preview lays out: top-level
 * siblings in a fragment, and each caption comment opening a captioned cell.
 * Lines stay where they were, so errors point at the fence's own lines.
 */
export function toPreviewCode(code) {
  if (!startsWithJsx(code)) return code
  let open = false
  const lines = code.split('\n').map((line) => {
    const label = CAPTION.exec(line)?.[1]
    if (label === undefined) return line
    const cell = `<PreviewCell label={${JSON.stringify(label)}}>`
    const close = open ? '</PreviewCell>' : ''
    open = true
    return close + cell
  })
  return `<>${lines.join('\n')}${open ? '</PreviewCell>' : ''}</>`
}

// A quoted root-relative path to a static file, by extension, so a route such
// as '/users/jane.doe' or a path under /api/ stays as written. A query or hash
// may follow.
const ASSET_URL =
  /(['"])(\/(?!\/|api\/)[\w./-]*\.(?:avif|csv|gif|ico|jpe?g|mp3|mp4|pdf|png|svg|txt|webm|webp|woff2?)(?:[?#][^'"\s]*)?)\1/gi

/** Prefixes the docs' base path to asset URLs, so fences use the plain URL a consumer would. */
export const withBasePath = (code, basePath) =>
  basePath
    ? code.replace(ASSET_URL, (match, quote, path) =>
        path.startsWith(`${basePath}/`)
          ? match
          : `${quote}${basePath}${path}${quote}`
      )
    : code
