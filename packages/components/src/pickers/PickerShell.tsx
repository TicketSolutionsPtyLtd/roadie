'use client'

import {
  type ReactNode,
  type RefObject,
  createContext,
  use,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore
} from 'react'

import { XIcon } from '@phosphor-icons/react'

import { viewerTimeZone } from '@oztix/roadie-core/datetime'
import { cn } from '@oztix/roadie-core/utils'

import { IconButton } from '../components/Button/IconButton'
import { Drawer } from '../components/Drawer'
import { useFieldContext } from '../components/Field'
import { Popover, type PopoverTriggerProps } from '../components/Popover'
import { mergeRefs } from '../utils/mergeRefs'

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

/** Below Navigator's phone breakpoint, a picker opens in a bottom drawer. */
export const PHONE = '(width < 48rem)'

/** Whether a media query matches; false on the server and through hydration. */
export function useMediaMatch(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query]
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  )
}

// True on the server and through hydration, so the first client render matches.
const useHydrating = () =>
  useSyncExternalStore(
    noSubscription,
    () => false,
    () => true
  )

export type PickerSurface = 'popover' | 'drawer'

/**
 * A popover from the phone breakpoint up and a drawer below it. Chosen as the
 * picker opens and held while it is open, so turning the phone can't swap the
 * surface under the person using it.
 */
export function usePickerSurface(open: boolean): PickerSurface {
  const phone = useMediaMatch(PHONE)
  const hydrating = useHydrating()
  const live: PickerSurface = phone ? 'drawer' : 'popover'
  const [held, setHeld] = useState<PickerSurface | null>(null)
  const holding = open && !hydrating
  if (holding && held === null) setHeld(live)
  if (!holding && held !== null) setHeld(null)
  return (holding && held) || live
}

const PickerTriggerContext = createContext<{
  ref: RefObject<HTMLElement | null> | null
  drawerOpen: boolean
}>({ ref: null, drawerOpen: false })

export type PickerTriggerProps = Omit<
  PopoverTriggerProps,
  'handle' | 'payload' | 'openOnHover' | 'delay' | 'closeDelay'
>

/**
 * The button that opens the picker's popover or drawer. It is always the
 * popover's trigger, so crossing the breakpoint never remounts it and loses
 * its focus; the drawer opens from the same state and hands focus back to it.
 */
export function PickerTrigger({ ref, ...props }: PickerTriggerProps) {
  const { ref: triggerRef, drawerOpen } = use(PickerTriggerContext)
  const refs = useMemo(
    () => mergeRefs(ref, triggerRef ?? undefined),
    [ref, triggerRef]
  )
  // The popover's state can't see the drawer, so the drawer's is given.
  const expanded = drawerOpen
    ? { 'aria-expanded': true, 'data-popup-open': '' }
    : {}
  return <Popover.Trigger ref={refs} {...props} {...expanded} />
}

/** The picker's label as shown, without its required or optional mark. */
function labelText(ids: string | undefined): string {
  return (ids ?? '')
    .split(' ')
    .map((id) => {
      const label = id && document.getElementById(id)
      if (!label) return ''
      const copy = label.cloneNode(true) as HTMLElement
      copy
        .querySelectorAll(
          '[aria-hidden="true"], [data-slot="optional-indicator"]'
        )
        .forEach((mark) => mark.remove())
      return copy.textContent?.trim() ?? ''
    })
    .filter(Boolean)
    .join(' ')
}

// The label is the page's own markup, so it is read from the page as the
// drawer opens.
function PickerTitle({
  labelSource,
  action
}: {
  labelSource: string | undefined
  action: string
}) {
  const label = useSyncExternalStore(
    noSubscription,
    () => labelText(labelSource),
    () => ''
  )
  return <Drawer.Title>{label || action}</Drawer.Title>
}

export type PickerOverlayProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  surface: PickerSurface
  /** What the popover lines up with. It holds the `PickerTrigger`. */
  trigger: ReactNode
  anchor: RefObject<HTMLElement | null>
  'aria-labelledby': string
  /** The ids naming the picker, shown as the drawer's title. */
  labelSource: string | undefined
  /** The drawer's title when nothing names the picker, such as "Choose date". */
  action: string
  /** Where focus goes on open. Defaults to the calendar's focusable day. */
  initialFocus?: (popup: HTMLElement) => HTMLElement | null | undefined
  /** Classes for the popover. */
  className?: string
  /** Actions after the content, kept in view at the foot of a drawer. */
  footer?: ReactNode
  children: ReactNode
}

const calendarTabStop = (popup: HTMLElement) =>
  popup.querySelector<HTMLElement>(
    '[data-slot="calendar"] button[data-date][tabindex="0"]'
  )

/**
 * A field with a popup: a popover that lines up with its start edge, or on a
 * phone a bottom drawer with the picker's label, its content and its actions.
 */
export function PickerOverlay({
  open,
  onOpenChange,
  surface,
  trigger,
  anchor,
  'aria-labelledby': ariaLabelledBy,
  labelSource,
  action,
  initialFocus = calendarTabStop,
  className,
  footer,
  children
}: PickerOverlayProps) {
  const popupRef = useRef<HTMLDivElement>(null)
  const focusOnOpen = () =>
    (popupRef.current && initialFocus(popupRef.current)) ?? true
  const triggerRef = useRef<HTMLElement>(null)
  const drawer = surface === 'drawer'
  // The surface is only known after hydration, so neither opens before it.
  const hydrating = useHydrating()
  const shown = open && !hydrating

  return (
    <PickerTriggerContext
      value={{ ref: triggerRef, drawerOpen: shown && drawer }}
    >
      <Popover open={shown && !drawer} onOpenChange={onOpenChange}>
        <Drawer open={shown && drawer} onOpenChange={onOpenChange}>
          {trigger}
          <Popover.Content
            ref={popupRef}
            aria-labelledby={ariaLabelledBy}
            align='start'
            positionerProps={{ anchor }}
            className={cn('max-w-[var(--available-width)]', className)}
            initialFocus={focusOnOpen}
          >
            {children}
            {footer && (
              <Popover.Footer className='justify-end'>{footer}</Popover.Footer>
            )}
          </Popover.Content>
          <Drawer.Content
            ref={popupRef}
            aria-labelledby={ariaLabelledBy}
            initialFocus={focusOnOpen}
            finalFocus={triggerRef}
          >
            <Drawer.Header>
              <Drawer.Close
                render={
                  <IconButton aria-label='Close' emphasis='normal'>
                    <XIcon weight='bold' className='size-5' />
                  </IconButton>
                }
              />
              <PickerTitle labelSource={labelSource} action={action} />
            </Drawer.Header>
            <Drawer.Body
              className={cn(
                '@container [--calendar-day:min(--spacing(12),100cqi/7)]',
                // With no footer to clear it, the body clears the home indicator.
                !footer && 'pb-[max(--spacing(6),env(safe-area-inset-bottom))]'
              )}
            >
              {children}
            </Drawer.Body>
            {footer && <Drawer.Footer>{footer}</Drawer.Footer>}
          </Drawer.Content>
        </Drawer>
      </Popover>
    </PickerTriggerContext>
  )
}
