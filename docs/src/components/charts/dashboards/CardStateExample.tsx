import type { ReactNode } from 'react'

import { Button } from '@oztix/roadie-components/button'
import { DataCard } from '@oztix/roadie-components/data-card'
import { Sparkline } from '@oztix/roadie-components/sparkline'
import type { CardState } from '@oztix/roadie-core/dashboard-layout'

const SOLD_TREND = [40, 62, 70, 88, 95, 120, 131, 160, 172, 190]

/** A state's guidance beside a stat card in that state. */
export function CardStateExample({
  state,
  children
}: {
  state: CardState
  children: ReactNode
}) {
  return (
    <div className='grid items-center gap-4 md:grid-cols-2'>
      <div className='grid gap-1 [&>p]:m-0'>{children}</div>
      <div data-not-prose className='grid'>
        <DataCard
          label='Tickets sold'
          value={1842}
          delta={{ value: 214 }}
          context='This week, of 2,400'
          source='Oztix sales.'
          state={state}
          bodyHeight='2rem'
          emptyMessage='No sales yet. Tickets go on sale Fri 27 Nov.'
          errorAction={
            <Button size='sm' emphasis='normal'>
              Retry
            </Button>
          }
          staleLabel='As of 10:42am'
        >
          <Sparkline values={SOLD_TREND} />
        </DataCard>
      </div>
    </div>
  )
}
