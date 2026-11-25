import { KanbanIcon } from '@phosphor-icons/react/ssr'

import type { RecordLayoutDefinition } from '../Records/layouts'
import { RecordBoardContent } from './RecordBoardContent'
import type { BoardLayoutConfig } from './types'

export type BoardLayoutDefinition = RecordLayoutDefinition<BoardLayoutConfig>

/** The board layout for `Records`: a column per option of a field, a lane per option of a second, with cards moved between columns. */
export function boardLayout<Row extends object>(
  config: BoardLayoutConfig<Row>
): BoardLayoutDefinition {
  return {
    type: 'board',
    label: 'Board',
    icon: <KanbanIcon weight='bold' className='size-4' aria-hidden />,
    // A part's functions and onMove read the consumer's Row; the board hands them the same row.
    config: config as unknown as BoardLayoutConfig,
    layout: {
      type: 'board',
      groupBy:
        typeof config.groupBy === 'string' ? [config.groupBy] : config.groupBy
    },
    Content: RecordBoardContent
  }
}
