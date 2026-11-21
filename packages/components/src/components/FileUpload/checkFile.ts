export type FileUploadRejectionCode = 'wrong-type' | 'too-large' | 'too-small'

export type FileUploadRejection = {
  file: File
  code: FileUploadRejectionCode
  message: string
}

export type FileRules = {
  /** File types the field takes, in the native `accept` syntax: `.csv`, `image/*`, `application/pdf`. */
  accept?: string
  /** The largest file the field takes, in bytes. */
  maxFileSize?: number
  /** The smallest file the field takes, in bytes. */
  minFileSize?: number
}

function matchesAccept(file: File, accept: string) {
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()
  return accept
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .some((token) => {
      if (!token) return false
      if (token.startsWith('.')) return name.endsWith(token)
      if (token.endsWith('/*')) return type.startsWith(token.slice(0, -1))
      return type === token
    })
}

const units = [
  [1e9, 'gigabyte'],
  [1e6, 'megabyte'],
  [1e3, 'kilobyte']
] as const

// Decimal units, as Finder and Explorer's size column show them. Limits round
// so "over" and "under" stay true.
export function formatFileSize(
  bytes: number,
  roundingMode: 'floor' | 'ceil' | 'halfExpand' = 'halfExpand'
) {
  const [size, unit] = units.find(([size]) => bytes >= size) ?? [1, 'byte']
  return new Intl.NumberFormat('en-AU', {
    style: 'unit',
    unit,
    unitDisplay: unit === 'byte' ? 'long' : 'short',
    maximumFractionDigits: 1,
    roundingMode
  }).format(bytes / size)
}

export function checkFile(
  file: File,
  { accept, maxFileSize, minFileSize }: FileRules
): FileUploadRejection | null {
  const reject = (code: FileUploadRejectionCode, message: string) => ({
    file,
    code,
    message
  })
  if (accept && !matchesAccept(file, accept))
    return reject(
      'wrong-type',
      `${file.name} isn't a file type this field takes.`
    )
  if (maxFileSize !== undefined && file.size > maxFileSize)
    return reject(
      'too-large',
      `${file.name} is over ${formatFileSize(maxFileSize, 'floor')}.`
    )
  if (minFileSize !== undefined && file.size < minFileSize)
    return reject(
      'too-small',
      `${file.name} is under ${formatFileSize(minFileSize, 'ceil')}.`
    )
  return null
}
