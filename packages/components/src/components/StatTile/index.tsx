import { DataCard, type DataCardProps } from '../DataCard'
import { Sparkline, type SparklineReference } from '../Sparkline'

export type StatTileProps = Omit<
  DataCardProps,
  'size' | 'takeaway' | 'children' | 'value'
> & {
  value: number | string
  /** Recent history, oldest first. Hidden with fewer than 5 points. */
  trend?: readonly number[]
  reference?: SparklineReference
}

export function StatTile({ trend, reference, ...props }: StatTileProps) {
  return (
    <DataCard size='stat' bodyHeight='2rem' {...props}>
      {trend && <Sparkline values={trend} reference={reference} />}
    </DataCard>
  )
}
StatTile.displayName = 'StatTile'
