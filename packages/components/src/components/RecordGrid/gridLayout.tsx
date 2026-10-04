import { SquaresFourIcon } from '@phosphor-icons/react/ssr'

import type { RecordLayoutDefinition } from '../Records/layouts'
import { RecordGridContent } from './RecordGridContent'
import { RecordGridSettingsLazy } from './RecordGridSettingsLazy'
import type { GridLayoutConfig } from './types'

export type GridLayoutDefinition = RecordLayoutDefinition<GridLayoutConfig>

/** The grid layout for `Records`: a card per record, showing these fields. */
export function gridLayout<Row extends object>(
  config: GridLayoutConfig<Row>
): GridLayoutDefinition {
  return {
    type: 'grid',
    label: 'Grid',
    icon: <SquaresFourIcon weight='bold' className='size-4' aria-hidden />,
    // A part's functions read the consumer's Row; the card hands it the same row.
    config: config as GridLayoutConfig,
    Content: RecordGridContent,
    Settings: RecordGridSettingsLazy
  }
}
