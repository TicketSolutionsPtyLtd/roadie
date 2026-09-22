import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { isDev } from '../../utils/isDev'
import { MARK_PATH } from '../Logo/markPath'
import { type QRMatrix, getQRMatrix } from './getQRMatrix'
import { TILE_MODULES, type Tile, getTile, isInTile } from './tile'

const QUIET_ZONE = 4
const MARK_PADDING = 0.8

// Only the :root light tokens: they don't swap under .dark, so the code stays dark on white everywhere.
const INK = 'var(--color-neutral-light-13, #0d1318)'
const PAPER = 'var(--color-neutral-light-0, #ffffff)'

export type QRCodeProps = Omit<
  ComponentProps<'svg'>,
  'children' | 'viewBox'
> & {
  /** The text to encode, such as a ticket hash. Encoded as given at error correction level H. */
  value: string
  /**
   * Adds a mark on a 5×5-module tile in the centre. `false` renders a plain code.
   * @default true
   */
  branded?: boolean
  /**
   * The mark on the branded tile, drawn white in a 3.4-module square. Pass an `<svg>` with a `viewBox`, or an icon at `size='100%'`, filled with `currentColor`.
   * @default The Oztix mark
   */
  children?: ReactNode
}

function OztixMark() {
  return (
    <svg viewBox='0 0 48 48'>
      <path d={MARK_PATH} />
    </svg>
  )
}

// A flag, not a set of values, so ticket hashes are never held for the process lifetime.
let hasWarnedPlainFallback = false

function warnPlainFallback(reason: string) {
  if (!isDev() || hasWarnedPlainFallback) return
  hasWarnedPlainFallback = true
  console.warn(
    `[Roadie QRCode] Rendering a plain code because ${reason}. Shorten the value to keep the branded tile.`
  )
}

function square(col: number, row: number, width: number, height: number) {
  return `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h${width}v${height}h-${width}z`
}

// The tile is a subpath of the modules, not its own rect, so no anti-aliased seam shows where they meet.
function modulesPath({ size, dark }: QRMatrix, tile: Tile | null) {
  let path = ''
  for (let row = 0; row < size; row++) {
    let col = 0
    while (col < size) {
      if (!dark(row, col) || isInTile(tile, row, col)) {
        col++
        continue
      }
      const runStart = col
      while (col < size && dark(row, col) && !isInTile(tile, row, col)) col++
      path += square(runStart, row, col - runStart, 1)
    }
  }
  if (tile) path += square(tile.start, tile.start, TILE_MODULES, TILE_MODULES)
  return path
}

export function QRCode({
  value,
  branded = true,
  children = <OztixMark />,
  className,
  'aria-label': ariaLabel = 'QR code',
  ...props
}: QRCodeProps) {
  const matrix = getQRMatrix(value)
  const { tile, reason } = branded ? getTile(matrix) : { tile: null }
  if (reason) warnPlainFallback(reason)

  const extent = matrix.size + QUIET_ZONE * 2
  const markOrigin = tile ? tile.start + QUIET_ZONE + MARK_PADDING : 0
  const markSize = TILE_MODULES - MARK_PADDING * 2

  return (
    <svg
      data-slot='qr-code'
      data-branded={tile ? '' : undefined}
      role='img'
      aria-label={ariaLabel}
      shapeRendering='crispEdges'
      {...props}
      viewBox={`0 0 ${extent} ${extent}`}
      className={cn('block aspect-square h-auto w-full', className)}
    >
      <rect width={extent} height={extent} style={{ fill: PAPER }} />
      <path
        data-slot='qr-code-modules'
        d={modulesPath(matrix, tile)}
        style={{ fill: INK }}
      />
      {tile && (
        <svg
          data-slot='qr-code-mark'
          x={markOrigin}
          y={markOrigin}
          width={markSize}
          height={markSize}
          shapeRendering='geometricPrecision'
          aria-hidden='true'
          style={{ color: PAPER, fill: PAPER }}
        >
          {children}
        </svg>
      )}
    </svg>
  )
}

QRCode.displayName = 'QRCode'
