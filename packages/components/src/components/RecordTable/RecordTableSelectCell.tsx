'use client'

import { type KeyboardEvent, type MouseEvent, useRef } from 'react'

import { Checkbox } from '../Checkbox'
import { SURVIVOR } from '../Records/useBulkActions'

export function RecordTablePageCheckbox({
  state,
  onChange,
  disabled
}: {
  state: boolean | 'mixed'
  onChange: (value: boolean) => void
  disabled?: boolean
}) {
  return (
    <Checkbox
      aria-label='Select page'
      data-slot='record-table-page-checkbox'
      {...{ [SURVIVOR]: 'selection' }}
      disabled={disabled}
      checked={state === true}
      indeterminate={state === 'mixed'}
      onCheckedChange={(checked) => onChange(checked)}
    />
  )
}

export function RecordTableRowCheckbox({
  id,
  title,
  selected,
  onToggle
}: {
  id: string
  title: string
  selected: boolean
  onToggle: (id: string, range: boolean) => void
}) {
  // Space activates via a programmatic click, which drops modifier keys,
  // so Shift is read from the real key events. Focus can leave mid-chord
  // (Shift+Tab) and the keyup lands elsewhere, so blur resets it.
  const shiftHeld = useRef(false)
  const trackShift = (event: KeyboardEvent) => {
    shiftHeld.current = event.shiftKey
  }
  return (
    <Checkbox
      aria-label={`Select ${title}`}
      checked={selected}
      onKeyDown={trackShift}
      onKeyUp={trackShift}
      onBlur={() => {
        shiftHeld.current = false
      }}
      onClick={(event: MouseEvent) => {
        event.preventDefault()
        onToggle(id, event.shiftKey || shiftHeld.current)
      }}
    />
  )
}
