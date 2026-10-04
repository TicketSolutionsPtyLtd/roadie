'use client'

import { type KeyboardEvent, type MouseEvent, useRef } from 'react'

import { Checkbox } from '../Checkbox'

/** A record's own checkbox, named by its title. */
export function RecordsRowCheckbox({
  id,
  title,
  selected,
  onToggle,
  rowTarget = false
}: {
  id: string
  title: string
  selected: boolean
  onToggle: (id: string, range: boolean) => void
  /** Covers its record, so a tap anywhere on it toggles. */
  rowTarget?: boolean
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
      data-interactive-target={rowTarget ? '' : undefined}
      // The record shows hover and press; a scaling box would shrink the overlay mid-tap.
      className={rowTarget ? 'transform-none! bg-transparent!' : undefined}
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
