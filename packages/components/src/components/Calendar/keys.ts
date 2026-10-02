import { addDays, addMonths, startOfWeek } from '@oztix/roadie-core/datetime'

type KeyOptions = { shiftKey?: boolean; weekStart?: number; rtl?: boolean }

/** Where a grid key moves focus from `date`, or null for keys it ignores. */
export function dateForKey(
  key: string,
  date: string,
  { shiftKey = false, weekStart = 1, rtl = false }: KeyOptions
): string | null {
  const forward = rtl ? -1 : 1
  switch (key) {
    case 'ArrowLeft':
      return addDays(date, -forward)
    case 'ArrowRight':
      return addDays(date, forward)
    case 'ArrowUp':
      return addDays(date, -7)
    case 'ArrowDown':
      return addDays(date, 7)
    case 'PageUp':
      return addMonths(date, shiftKey ? -12 : -1)
    case 'PageDown':
      return addMonths(date, shiftKey ? 12 : 1)
    case 'Home':
      return startOfWeek(date, weekStart)
    case 'End':
      return addDays(startOfWeek(date, weekStart), 6)
    default:
      return null
  }
}
