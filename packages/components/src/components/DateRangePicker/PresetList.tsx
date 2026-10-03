'use client'

import { useId } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { Toggle } from '../Toggle'
import { type DateRangePreset, groupPresets, presetLabel } from './range'

const presetClass = 'justify-start whitespace-nowrap'

export type PresetListProps = {
  presets: readonly DateRangePreset[]
  /** A column beside the calendar from `sm`, rather than rows above it. */
  beside?: boolean
  pressed: DateRangePreset | 'custom' | null
  onChoose: (preset: DateRangePreset) => void
  onCustom: () => void
  disabled?: boolean
  locale?: string
}

/** Presets in their groups, then Custom range. */
export function PresetList({
  presets,
  beside = true,
  pressed,
  onChoose,
  onCustom,
  disabled,
  locale
}: PresetListProps) {
  const id = useId()
  const buttons = (list: DateRangePreset[]) => (
    <div className={cn('flex flex-wrap gap-1', beside && 'sm:grid sm:gap-0.5')}>
      {list.map((preset) => (
        <Toggle
          key={presets.indexOf(preset)}
          data-slot='date-range-picker-preset'
          emphasis='subtler'
          size='sm'
          pressed={pressed === preset}
          onPressedChange={() => onChoose(preset)}
          disabled={disabled}
          className={presetClass}
        >
          {presetLabel(preset, locale)}
        </Toggle>
      ))}
    </div>
  )

  return (
    <div
      role='group'
      aria-label='Presets'
      data-slot='date-range-picker-presets'
      className={cn(
        'grid content-start gap-3',
        beside && 'sm:border-e sm:border-subtle sm:pe-4'
      )}
    >
      {groupPresets(presets).map(({ group, presets: list }, index) =>
        group === undefined ? (
          <div key='ungrouped'>{buttons(list)}</div>
        ) : (
          <div
            key={group}
            role='group'
            aria-labelledby={`${id}-${index}`}
            className='grid gap-1'
          >
            <p
              id={`${id}-${index}`}
              className='px-3 text-xs font-medium text-subtle'
            >
              {group}
            </p>
            {buttons(list)}
          </div>
        )
      )}
      <div className={cn('flex', beside && 'sm:grid')}>
        <Toggle
          data-slot='date-range-picker-preset'
          data-custom=''
          emphasis='subtler'
          size='sm'
          pressed={pressed === 'custom'}
          onPressedChange={onCustom}
          disabled={disabled}
          className={presetClass}
        >
          Custom range
        </Toggle>
      </div>
    </div>
  )
}
