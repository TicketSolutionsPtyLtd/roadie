'use client'

import {
  type ReactNode,
  type RefObject,
  useId,
  useRef,
  useState,
  useSyncExternalStore
} from 'react'

import { viewerTimeZone } from '@oztix/roadie-core/datetime'
import { cn } from '@oztix/roadie-core/utils'

import { useFieldContext } from '../components/Field'
import { Popover } from '../components/Popover'

const noSubscription = () => () => {}

/**
 * The zone a picker reads in. The server can't know the viewer's zone, so it
 * renders UTC and hydration moves to the viewer's, re-reading the same instant.
 */
export function usePickerZone(timeZone: string | undefined): string {
  const viewerZone = useSyncExternalStore(
    noSubscription,
    viewerTimeZone,
    () => 'UTC'
  )
  return timeZone ?? viewerZone
}

export type PickerOpenOptions = {
  open: boolean | undefined
  defaultOpen: boolean | undefined
  onOpenChange: ((open: boolean) => void) | undefined
}

export function usePickerOpen({
  open: openProp,
  defaultOpen = false,
  onOpenChange
}: PickerOpenOptions) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen)
  const open = openProp ?? uncontrolled
  function setOpen(next: boolean) {
    if (openProp === undefined) setUncontrolled(next)
    onOpenChange?.(next)
  }
  return [open, setOpen] as const
}

export type PickerLabelOptions = {
  /** What the button does, such as "Choose date". */
  action: string
  'aria-label'?: string
  'aria-labelledby'?: string
  /** The value as shown, so the button names what it changes. */
  valueText?: string
}

/**
 * Names a picker's calendar button and popup after the picker's own label, so
 * two pickers side by side stay apart: "Choose date, Doors (Fri 27 Nov 2026)".
 */
export function usePickerLabels({
  action,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  valueText
}: PickerLabelOptions) {
  const field = useFieldContext()
  const id = useId()
  const actionId = `${id}-action`
  const ownLabelId = `${id}-label`
  const valueId = `${id}-value`
  const labelSource =
    ariaLabelledBy ?? (ariaLabel ? ownLabelId : field.labelId || undefined)
  const join = (...ids: (string | false | undefined)[]) =>
    ids.filter(Boolean).join(' ')

  return {
    labelSource,
    triggerLabelledBy: join(actionId, labelSource, !!valueText && valueId),
    popupLabelledBy: join(actionId, labelSource),
    labels: (
      <>
        <span id={actionId} hidden>
          {labelSource ? `${action},` : action}
        </span>
        {ariaLabel && !ariaLabelledBy && (
          <span id={ownLabelId} hidden>
            {ariaLabel}
          </span>
        )}
        {valueText && (
          <span id={valueId} hidden>
            ({valueText})
          </span>
        )}
      </>
    )
  }
}

export type PickerPopoverProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** What the popup lines up with. It holds the `Popover.Trigger`. */
  trigger: ReactNode
  anchor: RefObject<HTMLElement | null>
  'aria-labelledby': string
  /** Where focus goes on open. Defaults to the calendar's focusable day. */
  initialFocus?: (popup: HTMLElement) => HTMLElement | null | undefined
  className?: string
  children: ReactNode
}

const calendarTabStop = (popup: HTMLElement) =>
  popup.querySelector<HTMLElement>(
    '[data-slot="calendar"] button[data-date][tabindex="0"]'
  )

/** A field with a popup that lines up with its start edge. */
export function PickerPopover({
  open,
  onOpenChange,
  trigger,
  anchor,
  'aria-labelledby': ariaLabelledBy,
  initialFocus = calendarTabStop,
  className,
  children
}: PickerPopoverProps) {
  const popupRef = useRef<HTMLDivElement>(null)
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      {trigger}
      <Popover.Content
        ref={popupRef}
        aria-labelledby={ariaLabelledBy}
        align='start'
        positionerProps={{ anchor }}
        className={cn('max-w-[var(--available-width)]', className)}
        initialFocus={() =>
          (popupRef.current && initialFocus(popupRef.current)) ?? true
        }
      >
        {children}
      </Popover.Content>
    </Popover>
  )
}
