import { type Instantish, isAbsoluteRange } from '@oztix/roadie-core/datetime'
import {
  type DescribeRecordFilterOptions,
  type RecordField,
  type RecordFilter,
  type RecordFilterDescription,
  describeRecordFilter
} from '@oztix/roadie-core/records'

/** Whether `now` came from a clock, not the epoch that stands in until the browser's is read. */
export const knowsNow = (now: Instantish) =>
  (now instanceof Date ? now.getTime() : now.epochMilliseconds) !== 0

/**
 * A filter in words, as `describeRecordFilter` puts it, but with no dates
 * resolved against the epoch: until the clock is known, a relative range
 * keeps its name and drops its dates, and one with no name reads as its field.
 */
export function describeFilter(
  filter: RecordFilter,
  fields: readonly RecordField[],
  options: DescribeRecordFilterOptions
): RecordFilterDescription {
  const described = describeRecordFilter(filter, fields, options)
  if (
    filter.operator !== 'within' ||
    isAbsoluteRange(filter.value) ||
    knowsNow(options.now)
  )
    return described
  if (described.detail)
    return { label: described.label, value: described.value }
  const name =
    fields.find(({ key }) => key === filter.field)?.label ?? filter.field
  return { label: name, value: '' }
}
