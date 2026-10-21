import {
  BrowserIcon,
  DatabaseIcon,
  MagnifyingGlassIcon,
  PlugsConnectedIcon
} from '@phosphor-icons/react/ssr'

import { Card } from '@oztix/roadie-components/card'
import { IconTile } from '@oztix/roadie-components/icon-tile'

import { RECORDS_ADAPTERS } from './adapters'

const ICONS = {
  Browser: BrowserIcon,
  Meilisearch: MagnifyingGlassIcon,
  Elasticsearch: DatabaseIcon,
  'Your API': PlugsConnectedIcon
} as const

export function RecordsAdapters() {
  return (
    <ul
      data-slot='records-adapters'
      data-not-prose
      className='grid list-none gap-4 p-0 @md:grid-cols-2'
    >
      {RECORDS_ADAPTERS.map(({ name, call, use }) => {
        const Icon = ICONS[name as keyof typeof ICONS]
        return (
          <li key={name} data-twin-row className='grid'>
            <Card emphasis='subtle'>
              <Card.Content className='grid content-start gap-3 p-5'>
                <div className='flex items-center gap-3'>
                  <IconTile size='sm'>
                    <Icon weight='bold' />
                  </IconTile>
                  <p data-twin-cell className='text-display-ui-6 text-strong'>
                    {name}
                  </p>
                </div>
                <code
                  data-twin-cell
                  className='font-mono text-sm break-words text-strong'
                >
                  {call}
                </code>
                <p data-twin-cell className='text-sm text-subtle'>
                  {use}
                </p>
              </Card.Content>
            </Card>
          </li>
        )
      })}
    </ul>
  )
}
