'use client'

import { useId } from 'react'

import { type DateRangePreset, groupPresets, presetLabel } from './range'

const presetClass =
  'is-interactive flex h-8 shrink-0 items-center rounded-full border px-3 text-start text-sm whitespace-nowrap not-aria-pressed:emphasis-subtler not-aria-pressed:border-transparent not-aria-pressed:text-subtle aria-pressed:emphasis-subtle aria-pressed:is-selected'

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
    <div className='flex flex-wrap gap-1 sm:grid sm:gap-0.5'>
      {list.map((preset) => (
        <button
          key={presets.indexOf(preset)}
          type='button'
          data-slot='date-range-picker-preset'
          aria-pressed={pressed === preset}
          disabled={disabled}
          className={presetClass}
          onClick={() => onChoose(preset)}
        >
          {presetLabel(preset, locale)}
        </button>
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
        <button
          type='button'
          data-slot='date-range-picker-preset'
          data-custom=''
          aria-pressed={pressed === 'custom'}
          disabled={disabled}
          className={presetClass}
          onClick={onCustom}
        >
          Custom range
        </button>
      </div>
    </div>
  )
}
