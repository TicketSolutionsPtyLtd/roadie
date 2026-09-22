import type { QRMatrix } from './getQRMatrix'

export const TILE_MODULES = 5

const MAX_CLEARED_SHARE = 0.1

export type Tile = { start: number; end: number }

export type TileResult =
  { tile: Tile; reason?: never } | { tile: null; reason: string }

export function getTile({ size, isFunction }: QRMatrix): TileResult {
  const start = (size - TILE_MODULES) / 2
  const end = start + TILE_MODULES

  if (TILE_MODULES ** 2 > size ** 2 * MAX_CLEARED_SHARE) {
    return { tile: null, reason: 'it would clear more than 10% of modules' }
  }

  for (let row = start; row < end; row++) {
    for (let col = start; col < end; col++) {
      if (isFunction(row, col)) {
        return { tile: null, reason: 'it would cover an alignment pattern' }
      }
    }
  }

  return { tile: { start, end } }
}

export function isInTile(tile: Tile | null, row: number, col: number) {
  return (
    tile !== null &&
    row >= tile.start &&
    row < tile.end &&
    col >= tile.start &&
    col < tile.end
  )
}
