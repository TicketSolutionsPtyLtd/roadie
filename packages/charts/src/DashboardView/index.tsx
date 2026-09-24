import { Dashboard } from '@oztix/roadie-components/dashboard'
import { DataCard } from '@oztix/roadie-components/data-card'
import { DataTable } from '@oztix/roadie-components/data-table'
import { StatTile } from '@oztix/roadie-components/stat-tile'
import type {
  CardSize,
  DashboardCard,
  DashboardSpec,
  StaticPlot
} from '@oztix/roadie-core/dashboard'

import { Chart } from '../Chart'
import { ChartLegend } from '../ChartLegend'

export type DashboardViewProps = { spec: DashboardSpec; className?: string }

function Plot({ plot }: { plot: StaticPlot }) {
  return (
    <>
      <img
        data-theme-image={plot.srcDark ? 'light' : undefined}
        src={plot.src}
        alt={plot.alt}
        className='size-full object-contain'
      />
      {plot.srcDark && (
        <img
          data-theme-image='dark'
          src={plot.srcDark}
          alt={plot.alt}
          className='size-full object-contain'
        />
      )}
    </>
  )
}

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
          table={card.table}
          legend={card.legend && <ChartLegend items={card.legend} />}
        >
          <Plot plot={card.plot} />
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
      {spec.sections.map((section) => (
        <Dashboard.Section
          key={section.title}
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
