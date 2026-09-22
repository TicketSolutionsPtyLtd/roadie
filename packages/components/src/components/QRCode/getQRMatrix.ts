import { QrCodeDataType, encode } from 'uqr'

const FUNCTION_PATTERNS = new Set<QrCodeDataType | undefined>([
  QrCodeDataType.Position,
  QrCodeDataType.Timing,
  QrCodeDataType.Alignment
])

export type QRMatrix = {
  size: number
  version: number
  dark: (row: number, col: number) => boolean
  /** True for finder, separator, timing and alignment modules, not format or version information. */
  isFunction: (row: number, col: number) => boolean
}

export function getQRMatrix(value: string): QRMatrix {
  const { size, version, data, types } = encode(value, {
    ecc: 'H',
    border: 0
  })

  return {
    size,
    version,
    dark: (row, col) => data[row]?.[col] === true,
    isFunction: (row, col) => FUNCTION_PATTERNS.has(types[row]?.[col])
  }
}
