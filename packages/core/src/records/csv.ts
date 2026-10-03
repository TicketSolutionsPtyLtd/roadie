import { type FormatRecordValueOptions, formatRecordValue } from './format'
import { read } from './match'
import type { RecordField } from './types'

export type RecordsToCsvOptions = FormatRecordValueOptions & {
  /** `raw` writes numbers and money unformatted, for sums in a spreadsheet. @default 'formatted' */
  values?: 'formatted' | 'raw'
}

const quote = (text: string) =>
  /[",\r\n]|^\s|\s$/.test(text) ? `"${text.replaceAll('"', '""')}"` : text

// Spreadsheets run text that opens like a formula; an apostrophe keeps it text.
const neutralise = (text: string) =>
  /^[=+\-@\t\r]/.test(text) ? `'${text}` : text

const isFigure = (field: RecordField) =>
  field.type === 'number' || field.type === 'money'

function cellText(
  row: object,
  field: RecordField,
  options: RecordsToCsvOptions
) {
  const value = read(row, field.key)
  if (options.values === 'raw' && isFigure(field) && typeof value === 'number')
    return Number.isFinite(value) ? String(value) : ''
  const text = formatRecordValue(row, field, options)
  if (text === null) return ''
  // Only text from the data can carry a formula; a formatted figure like -$20 can't.
  return quote(
    typeof value === 'number' || typeof value === 'boolean'
      ? text
      : neutralise(text)
  )
}

/**
 * Rows as RFC 4180 CSV, one column per field in the order given, each value
 * as its field reads in a table. Works anywhere, so a server can export the
 * same records a browser shows.
 */
export function recordsToCsv(
  rows: readonly object[],
  fields: readonly RecordField[],
  options: RecordsToCsvOptions
): string {
  const lines = [
    fields.map((field) => quote(neutralise(field.label))).join(',')
  ]
  for (const row of rows)
    lines.push(fields.map((field) => cellText(row, field, options)).join(','))
  return lines.join('\r\n')
}
