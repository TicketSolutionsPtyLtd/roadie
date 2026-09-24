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
import { PlotView, plotTable } from './plots'

export type DashboardViewProps = { spec: DashboardSpec; className?: string }

const cardProps = (card: DashboardCard) => ({
  label: card.label,
  context: card.context,
  state: card.state,
  emptyMessage: card.emptyMessage,
  errorMessage: card.errorMessage,
  staleLabel: card.staleLabel,
  source: card.source
})

function Card({ card, size }: { card: DashboardCard; size: CardSize }) {
  switch (card.kind) {
    case 'stat':
      return (
        <StatTile
          {...cardProps(card)}
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
          {...cardProps(card)}
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
          {...cardProps(card)}
          source={card.source}
          size={size}
          value={card.value}
          format={card.format}
          delta={card.delta}
          takeaway={card.takeaway}
          view={card.view}
          table={
            card.table ??
            (card.plot.kind === 'static' ? undefined : plotTable(card.plot))
          }
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
        <DataCard {...cardProps(card)} size={size}>
          <p className='text-sm text-normal'>{card.body}</p>
        </DataCard>
      )
  }
}

export function DashboardView({ spec, className }: DashboardViewProps) {
  return (
    <Dashboard className={className}>
      {spec.sections.map((section, index) => (
        <Dashboard.Section
          key={`${index}-${section.title}`}
          title={section.title}
          description={section.description}
        >
          {section.cards.map((card) => (
            <Card key={card.id} card={card} size={card.size} />
          ))}
        </Dashboard.Section>
      ))}
    </Dashboard>
  )
}
DashboardView.displayName = 'DashboardView'
