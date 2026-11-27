import { encodeFilter } from './encoding'
import type { RecordFilter } from './types'

/**
 * A filter's identity, equal for filters that filter the same way: whatever
 * their key order, the order or repeats of a chip's values, or how a relative
 * range is written. Compare it or use it as a key; never parse it.
 */
export function recordFilterKey(filter: RecordFilter): string {
  return encodeFilter(
    'values' in filter
      ? { ...filter, values: [...new Set(filter.values)].sort() }
      : filter
  )
}
