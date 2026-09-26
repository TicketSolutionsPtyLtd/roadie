import type { ReactNode } from 'react'

import { Dashboard } from '@oztix/roadie-components/dashboard'
import { DataCard } from '@oztix/roadie-components/data-card'
import { DataTable } from '@oztix/roadie-components/data-table'
import { StatTile } from '@oztix/roadie-components/stat-tile'
import type {
  CardSize,
  DashboardCard,
  DashboardSpec
} from '@oztix/roadie-core/dashboard'

import { Chart } from '../Chart'
import { ChartLegend } from '../ChartLegend'
import { cardTable } from '../tables/cardTable'
import { PlotView } from './plots'

export type DashboardViewProps = {
  spec: DashboardSpec
  /**
   * Actions for each card, such as a More button, placed at its top right.
   * They carry handlers, so they come from the app rather than the spec.
   * Return nothing to leave a card without actions. When this renders on the
   * server, return a client component that owns the handlers, not inline
   * handlers.
   */
  cardActions?: (card: DashboardCard) => ReactNode
  className?: string
}

const cardProps = (card: DashboardCard, actions: ReactNode) => ({
  actions,
  label: card.label,
  context: card.context,
  state: card.state,
  emptyMessage: card.emptyMessage,
  errorMessage: card.errorMessage,
  staleLabel: card.staleLabel,
  source: card.source
})

type CardProps = { card: DashboardCard; size: CardSize; actions: ReactNode }

function Card({ card, size, actions }: CardProps) {
  switch (card.kind) {
    case 'stat':
      return (
        <StatTile
          {...cardProps(card, actions)}
          value={card.value}
          format={card.format}
          delta={card.delta}
          trend={card.trend}
          reference={card.reference}
        />
      )
    case 'table':
      return (
        <DataCard
          {...cardProps(card, actions)}
          size={size}
          value={card.value}
          format={card.format}
          delta={card.delta}
          takeaway={card.takeaway}
        >
          <DataTable
            columns={card.columns}
            rows={card.rows}
            caption={card.label}
          />
        </DataCard>
      )
    case 'chart':
      return (
        <Chart
          {...cardProps(card, actions)}
          source={card.source}
          size={size}
          value={card.value}
          format={card.format}
          delta={card.delta}
          takeaway={card.takeaway}
          view={card.view}
          table={cardTable(card)}
          legend={card.legend && <ChartLegend items={card.legend} />}
        >
          <PlotView
            plot={card.plot}
            takeaway={
              card.plot.kind === 'static'
                ? undefined
                : (card.plot.takeaway ?? card.takeaway)
            }
          />
        </Chart>
      )
    case 'note':
      return (
        <DataCard {...cardProps(card, actions)} size={size}>
          <p className='text-sm text-normal'>{card.body}</p>
        </DataCard>
      )
  }
}

export function DashboardView({
  spec,
  cardActions,
  className
}: DashboardViewProps) {
  return (
    <Dashboard className={className}>
      {spec.sections.map((section, index) => (
        <Dashboard.Section
          key={`${index}-${section.title}`}
          title={section.title}
          description={section.description}
        >
          {section.cards.map((card) => (
            <Card
              key={card.id}
              card={card}
              size={card.size}
              actions={cardActions?.(card)}
            />
          ))}
        </Dashboard.Section>
      ))}
    </Dashboard>
  )
}
DashboardView.displayName = 'DashboardView'
