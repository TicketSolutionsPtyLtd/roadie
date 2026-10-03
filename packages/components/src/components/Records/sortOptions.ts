import type {
  RecordField,
  RecordSort,
  RecordSortDirection
} from '@oztix/roadie-core/records'

// As DataTable: words A to Z first, figures and dates largest or latest first.
export const firstDirection = (field: RecordField): RecordSortDirection =>
  field.type === 'text' || field.type === 'option' ? 'ascending' : 'descending'

// Matches `sortRecords`, which sorts a status map with an `order` by it.
const ordered = (field: RecordField) =>
  Object.values(field.status ?? {}).some((status) => status.order !== undefined)

const LABELS: Record<
  'words' | 'order' | 'figures' | 'dates' | 'yesNo',
  [ascending: string, descending: string]
> = {
  words: ['A to Z', 'Z to A'],
  order: ['First to last', 'Last to first'],
  figures: ['Low to high', 'High to low'],
  dates: ['Earliest first', 'Latest first'],
  yesNo: ['No first', 'Yes first']
}

function labelsFor(field: RecordField) {
  switch (field.type) {
    case 'number':
    case 'money':
      return LABELS.figures
    case 'date':
      return LABELS.dates
    case 'boolean':
      return LABELS.yesNo
    case 'option':
      return ordered(field) ? LABELS.order : LABELS.words
    case 'text':
      return LABELS.words
  }
}

/** A sort direction in the field's own terms, such as "Low to high". */
export const sortDirectionLabel = (
  field: RecordField,
  direction: RecordSortDirection
) => labelsFor(field)[direction === 'ascending' ? 0 : 1]

export const sortableFields = (fields: readonly RecordField[]) =>
  fields.filter((field) => field.sortable !== false)

/** The sort with the first sortable field it doesn't use yet, its natural way. */
export function addSort(
  sort: readonly RecordSort[],
  fields: readonly RecordField[]
): RecordSort[] {
  const used = new Set(sort.map(({ field }) => field))
  const next = sortableFields(fields).find((field) => !used.has(field.key))
  return next
    ? [...sort, { field: next.key, direction: firstDirection(next) }]
    : [...sort]
}
