import type { ReactNode } from 'react'

import { ProseTable } from '@/components/date-and-time/ReadsTable'
import { WIDTH_NAME } from '@/lib/card-sizes'

import {
  type CardSize,
  DASHBOARD_WIDTHS
} from '@oztix/roadie-core/dashboard-layout'

import { WidthDiagram } from './RowDiagram'

const FILLING_ROWS: { name: ReactNode; sizes: CardSize[] }[] = [
  {
    name: (
      <>
        Four <code>stat</code>
      </>
    ),
    sizes: ['stat', 'stat', 'stat', 'stat']
  },
  {
    name: (
      <>
        Two <code>md</code>
      </>
    ),
    sizes: ['md', 'md']
  },
  {
    name: (
      <>
        One <code>full</code>
      </>
    ),
    sizes: ['full']
  },
  {
    name: (
      <>
        Six <code>sm</code>
      </>
    ),
    sizes: ['sm', 'sm', 'sm', 'sm', 'sm', 'sm']
  },
  {
    name: (
      <>
        Mirrored <code>lg</code> + <code>sm</code>
      </>
    ),
    sizes: ['lg', 'sm', 'sm', 'lg']
  }
]

/** Rows of card sizes that fill at every width, drawn at each. */
export function RowsThatFill() {
  return (
    <ProseTable
      slot='rows-that-fill'
      head={['Row', ...DASHBOARD_WIDTHS.map((width) => WIDTH_NAME[width])]}
    >
      {FILLING_ROWS.map(({ name, sizes }, i) => (
        <tr key={i}>
          <td>{name}</td>
          {DASHBOARD_WIDTHS.map((width) => (
            <td key={width}>
              <div data-not-prose className='min-w-20'>
                <WidthDiagram sizes={sizes} width={width} />
              </div>
            </td>
          ))}
        </tr>
      ))}
    </ProseTable>
  )
}
