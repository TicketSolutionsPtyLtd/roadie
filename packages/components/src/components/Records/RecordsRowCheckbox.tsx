'use client'

import {
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  useRef
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { Checkbox } from '../Checkbox'
import { useKeepFocusOnLeave } from './useBulkActions'

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
  // The toggle comes from the hidden input's change, which carries no
  // modifiers, so Shift is read from the real key and mouse events. Focus
  // can leave mid-chord (Shift+Tab) and the keyup lands elsewhere, so
  // leaving resets it; the input handing focus to the box doesn't.
  const shiftHeld = useRef(false)
  const trackShift = (event: KeyboardEvent | MouseEvent) => {
    shiftHeld.current = event.shiftKey
  }
  return (
    // A press on the label's padding, or one that slips off the box as the
    // page moves, clicks the label, which reaches only the hidden input.
    <span
      className='contents'
      onMouseDownCapture={trackShift}
      onKeyDownCapture={trackShift}
      onKeyUpCapture={trackShift}
      onBlurCapture={(event: FocusEvent<HTMLSpanElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          shiftHeld.current = false
      }}
    >
      <Checkbox
        aria-label={`Select ${title}`}
        checked={selected}
        data-interactive-target={rowTarget ? '' : undefined}
        // The record shows hover and press; a scaling box would shrink the overlay mid-tap.
        className={rowTarget ? 'transform-none! bg-transparent!' : undefined}
        onCheckedChange={() => onToggle(id, shiftHeld.current)}
      />
    </span>
  )
}

/** Select mode's checkbox in a record's leading slot, at a thumbnail's size when one leads, so titles don't shift. */
export function RecordsSelectModeCheckbox({
  thumbnail,
  ...props
}: Parameters<typeof RecordsRowCheckbox>[0] & { thumbnail: boolean }) {
  const ref = useRef<HTMLSpanElement>(null)
  // Leaving Select mode unmounts it; focus goes to Select, or the records.
  useKeepFocusOnLeave(ref)
  return (
    <span
      ref={ref}
      className={cn('grid shrink-0 place-items-center', thumbnail && 'size-10')}
    >
      <RecordsRowCheckbox {...props} rowTarget />
    </span>
  )
}
