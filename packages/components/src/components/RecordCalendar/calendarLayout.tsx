import { CalendarBlankIcon } from '@phosphor-icons/react/ssr'

import type { RecordLayoutDefinition } from '../Records/layouts'
import { RecordCalendarContent } from './RecordCalendarContent'
import type { CalendarLayoutConfig } from './types'

export type CalendarLayoutDefinition =
  RecordLayoutDefinition<CalendarLayoutConfig>

/** The calendar layout for `Records`: a month grid with each record on its day. */
export function calendarLayout<Row extends object>(
  config: CalendarLayoutConfig<Row>
): CalendarLayoutDefinition {
  return {
    type: 'calendar',
    label: 'Calendar',
    icon: <CalendarBlankIcon weight='bold' className='size-4' aria-hidden />,
    config: config as CalendarLayoutConfig,
    layout: { type: 'calendar', dateField: config.dateField },
    Content: RecordCalendarContent
  }
}
