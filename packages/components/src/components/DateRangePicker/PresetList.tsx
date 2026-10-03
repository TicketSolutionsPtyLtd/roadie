'use client'

import { useId } from 'react'

import { Toggle } from '../Toggle'
import { type DateRangePreset, groupPresets, presetLabel } from './range'

const presetClass = 'justify-start whitespace-nowrap'

export type PresetListProps = {
  presets: readonly DateRangePreset[]
  pressed: DateRangePreset | 'custom' | null
  onChoose: (preset: DateRangePreset) => void
  onCustom: () => void
  disabled?: boolean
  locale?: string
}

/** Presets in their groups, then Custom range. */
export function PresetList({
  presets,
  pressed,
  onChoose,
  onCustom,
  disabled,
  locale
}: PresetListProps) {
  const id = useId()
  const buttons = (list: DateRangePreset[]) => (
    <div className={'flex flex-wrap gap-1 sm:grid sm:gap-0.5'}>
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
      className='grid content-start gap-3 sm:border-e sm:border-subtle sm:pe-4'
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
      <div className='flex sm:grid'>
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
