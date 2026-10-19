import type { RecordSelection } from '@oztix/roadie-core/records'

const format = new Intl.NumberFormat('en-AU')

/** A count, with a + when it's a floor the server stopped counting at. */
export const formatCount = (count: number, exact = true) =>
  `${format.format(count)}${exact ? '' : '+'}`

/** Every match but some, counted from a floor, is a floor too. */
export const selectionExact = (
  records: { resultCountExact: boolean },
  selection: RecordSelection
) => records.resultCountExact || !('allMatching' in selection)
