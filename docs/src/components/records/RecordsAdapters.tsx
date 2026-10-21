import type { Icon } from '@phosphor-icons/react'
import {
  BrowserIcon,
  DatabaseIcon,
  MagnifyingGlassIcon,
  PlugsConnectedIcon
} from '@phosphor-icons/react/ssr'

import { Card } from '@oztix/roadie-components/card'
import { IconTile } from '@oztix/roadie-components/icon-tile'

import { RECORDS_ADAPTERS, type RecordsAdapter } from './adapters'

const ICONS: Record<RecordsAdapter['name'], Icon> = {
  Browser: BrowserIcon,
  Meilisearch: MagnifyingGlassIcon,
  Elasticsearch: DatabaseIcon,
  'Your API': PlugsConnectedIcon
}

// Lets a call wrap between its arguments rather than inside a name.
const breakable = (call: string) =>
  call
    .split(/(?<=\(|, )/)
    .flatMap((part, i) => (i ? [<wbr key={i} />, part] : [part]))

export function RecordsAdapters() {
  return (
    <ul
      data-slot='records-adapters'
      data-not-prose
      className='grid list-none gap-4 p-0 @md:grid-cols-2'
    >
      {RECORDS_ADAPTERS.map(({ name, call, use }) => {
        const AdapterIcon = ICONS[name]
        return (
          <li key={name} data-twin-row className='grid min-w-0'>
            <Card emphasis='subtle'>
              <Card.Content className='grid content-start gap-3 p-5'>
                <div className='flex items-center gap-3'>
                  <IconTile size='sm'>
                    <AdapterIcon weight='bold' />
                  </IconTile>
                  <p data-twin-cell className='text-display-ui-6 text-strong'>
                    {name}
                  </p>
                </div>
                <code
                  data-twin-cell
                  className='font-mono text-sm wrap-anywhere text-strong'
                >
                  {breakable(call)}
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
