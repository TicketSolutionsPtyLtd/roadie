import type { ChartTable } from '../Chart'
import { fieldLabel, valueColumn } from '../plot/table'
import { scatterPoints } from './points'
import type { ScatterProps } from './types'

const POINT = 'point'

export function scatterTable(props: ScatterProps): ChartTable {
  const labelKey = props.label ?? POINT
  const size = props.size
  return {
    columns: [
      { key: labelKey, header: fieldLabel(labelKey), kind: 'text' },
      valueColumn(props.x, fieldLabel(props.x), props.xFormat),
      valueColumn(props.y, fieldLabel(props.y), props.format),
      ...(size ? [valueColumn(size, fieldLabel(size))] : [])
    ],
    rows: scatterPoints(props).map((p) => ({
      [labelKey]: p.name,
      [props.x]: p.xValue,
      [props.y]: p.yValue,
      ...(size && { [size]: p.size })
    }))
  }
}
