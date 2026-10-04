'use client'

import { Checkbox } from '../Checkbox'
import { SURVIVOR } from '../Records/useBulkActions'

export function RecordTablePageCheckbox({
  label = 'Select page',
  state,
  onChange,
  disabled
}: {
  label?: string
  state: boolean | 'mixed'
  onChange: (value: boolean) => void
  disabled?: boolean
}) {
  return (
    <Checkbox
      aria-label={label}
      data-slot='record-table-page-checkbox'
      {...{ [SURVIVOR]: 'selection' }}
      disabled={disabled}
      checked={state === true}
      indeterminate={state === 'mixed'}
      onCheckedChange={(checked) => onChange(checked)}
    />
  )
}
