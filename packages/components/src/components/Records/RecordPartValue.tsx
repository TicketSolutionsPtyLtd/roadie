import { RecordImage } from './RecordImage'
import { RecordValue } from './RecordValue'
import type { RecordPart } from './types'

export type RecordPartValueProps = {
  part: RecordPart
  row: object
  timeZone?: string
  className?: string
}

/** One part of a record as its layout shows it: a custom cell, an image, or the field's value. */
export function RecordPartValue({
  part,
  row,
  timeZone,
  className
}: RecordPartValueProps) {
  if (part.cell)
    return part.cell({
      value: (row as Record<string, unknown>)[part.key],
      row,
      field: part.field
    })
  if (part.kind === 'image') return <RecordImage part={part} row={row} />
  return (
    <RecordValue
      field={part.field}
      row={row}
      timeZone={timeZone}
      className={className}
    />
  )
}
