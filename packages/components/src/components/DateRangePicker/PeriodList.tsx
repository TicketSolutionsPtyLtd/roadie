'use client'

import { CheckIcon } from '@phosphor-icons/react'

import { cn } from '@oztix/roadie-core/utils'

import { List } from '../List'
import {
  type DateRangePreset,
  type RangeContext,
  describeRange,
  groupPresets,
  presetLabel
} from './range'

export type PeriodListProps = {
  presets: readonly DateRangePreset[]
  chosen: DateRangePreset | 'custom' | null
  onChoose: (preset: DateRangePreset) => void
  context: RangeContext
  locale?: string
}

/** A drawer's presets: one row each, its dates beside it, in their groups. */
export function PeriodList({
  presets,
  chosen,
  onChoose,
  context,
  locale
}: PeriodListProps) {
  const row = (preset: DateRangePreset) => {
    const current = chosen === preset
    const label = presetLabel(preset, locale)
    const dates = describeRange(preset.value, context, locale)?.detail
    return (
      <List.Item
        key={presets.indexOf(preset)}
        title={label}
        current={current}
        onClick={() => onChoose(preset)}
        trailing={
          <>
            {dates && (
              <span
                data-slot='date-range-picker-period-dates'
                className='text-sm text-subtle'
              >
                {dates}
              </span>
            )}
            <CheckIcon
              weight='bold'
              aria-hidden='true'
              className={cn('size-5', !current && 'invisible')}
            />
          </>
        }
      />
    )
  }

  return (
    <List aria-label='Periods' data-slot='date-range-picker-periods'>
      {groupPresets(presets).map(({ group, presets: list }) =>
        group === undefined ? (
          list.map(row)
        ) : (
          <List.Group key={group}>
            <List.GroupTitle render={<h3 />}>{group}</List.GroupTitle>
            {list.map(row)}
          </List.Group>
        )
      )}
    </List>
  )
}
