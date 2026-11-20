import { ListBulletsIcon } from '@phosphor-icons/react/ssr'

import type { RecordLayoutDefinition } from '../Records/layouts'
import { RecordListContent } from './RecordListContent'
import { RecordListSettings } from './RecordListSettings'
import type { ListLayoutConfig } from './types'

export type ListLayoutDefinition = RecordLayoutDefinition<ListLayoutConfig>

/** The list layout for `Records`: a row per record, showing these fields. */
export function listLayout<Row extends object>(
  config: ListLayoutConfig<Row>
): ListLayoutDefinition {
  return {
    type: 'list',
    label: 'List',
    icon: <ListBulletsIcon weight='bold' className='size-4' aria-hidden />,
    // A part's functions read the consumer's Row; the row hands it the same row.
    config: config as ListLayoutConfig,
    Content: RecordListContent,
    Settings: RecordListSettings
  }
}
