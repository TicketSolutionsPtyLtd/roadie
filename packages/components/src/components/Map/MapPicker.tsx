'use client'

import {
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState
} from 'react'

import { createPortal } from 'react-dom'

import { cn } from '@oztix/roadie-core/utils'

import { useMapContext } from './MapContext'
import { MapPin, type MapPinLook, pinAnchorClass, pinRingClass } from './MapPin'
import type { LatLng } from './engine'
import { PLACE_ZOOM, type Place } from './place'
import { useProjected } from './useProjected'

export type MapPickerProps = MapPinLook & {
  /**
   * The chosen place. `null` is controlled with nothing chosen. When it
   * changes from outside the map, such as from an address search in a form,
   * the map moves to show it at street level. The pin's own place passed
   * back, even rounded to four decimal places or a few moves late, leaves the
   * map where it is.
   */
  value?: Place | null
  /** The place chosen at first, when uncontrolled. */
  defaultValue?: Place | null
  /**
   * A click or tap on the map dropped the pin, or it was dragged or nudged.
   * The place keeps the label and address it had, with the new position and
   * `precision: 'manual'`. A pin dropped with no place before has an empty
   * label, for the app to fill, such as from its address service.
   */
  onValueChange?: (value: Place) => void
  /**
   * Submits the position with the form, as `lat,lng` to six decimal places,
   * or empty with no place chosen.
   */
  name?: string
  /** Shows the picker as invalid. Inside a `Field`, the field's is used. */
  invalid?: boolean
  /**
   * Stops the form submitting with no place chosen. Inside a `Field`, the
   * field's is used.
   */
  required?: boolean
  /**
   * Stops clicks dropping the pin and the pin moving. Inside a `Field`, the
   * field's is used.
   */
  disabled?: boolean
  /**
   * Names the pin for screen readers and keyboard users. Inside a `Field`,
   * the field's label names it unless this is given.
   * @default 'Chosen place'
   */
  label?: string
  className?: string
}

// Arrow keys nudge the pin this far, in CSS pixels; Shift moves it further.
const NUDGE = 8
const SHIFT_NUDGE = 40
const NUDGES: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0]
}

/**
 * Picks a place: a click or tap on the map drops the pin there, and the pin
 * drags, or moves with the arrow keys, to refine it, such as onto a venue's
 * entrance. Inside a `Field`, it takes the field's help and states.
 */
export function MapPicker({
  value,
  defaultValue = null,
  onValueChange,
  name,
  invalid,
  required,
  disabled,
  label,
  intent,
  icon,
  pin,
  className
}: MapPickerProps) {
  const { instance, frame, onMapClick, setPlace, field, formSlot } =
    useMapContext('Map.Picker')
  const isInvalid = invalid ?? field.invalid ?? false
  const isRequired = required ?? field.required ?? false
  const isDisabled = disabled ?? field.disabled ?? false
  const describedBy =
    (field.invalid ? field.errorTextId : field.helperTextId) || undefined
  const labelledBy =
    label === undefined ? field.labelId || undefined : undefined

  const [uncontrolled, setUncontrolled] = useState(defaultValue)
  const chosen = value === undefined ? uncontrolled : value
  const position = chosen?.position ?? null
  const point = useProjected(instance, position)
  const [dragging, setDragging] = useState(false)
  const pinButton = useRef<HTMLButtonElement>(null)
  const dropButton = useRef<HTMLButtonElement>(null)
  // Dropped from the keyboard, focus follows to the pin once it lands there.
  // A place from elsewhere, such as one the form chose instead, doesn't.
  const focusPin = useRef<LatLng | null>(null)
  useEffect(() => {
    const dropped = focusPin.current
    if (!dropped || !point || !position) return
    focusPin.current = null
    if (near(position, dropped)) pinButton.current?.focus()
  }, [point, position])

  // Fitting the map to its places includes the chosen one.
  const id = useId()
  const lat = position?.lat
  const lng = position?.lng
  useEffect(() => {
    if (lat === undefined || lng === undefined) return
    setPlace(id, { lat, lng })
    return () => setPlace(id, null)
  }, [id, lat, lng, setPlace])

  // The places the pin chose itself that the value hasn't caught up with yet,
  // oldest first, after the place the value last showed. A value near one of
  // them is the pin's own coming back, perhaps rounded or late; any other
  // came from outside the map, so the map goes to show it.
  const own = useRef<LatLng[]>(value ? [value.position] : [])

  const choose = (place: LatLng) => {
    if (isDisabled) return
    own.current = [...own.current.slice(1 - OWN_KEPT), place]
    // Placed by hand, it's no longer the address service's place.
    const next: Place = {
      ...(chosen ?? { label: '' }),
      position: place,
      precision: 'manual'
    }
    delete next.source
    if (value === undefined) setUncontrolled(next)
    onValueChange?.(next)
  }
  const dropPin = useEffectEvent(choose)

  useEffect(() => onMapClick((place) => dropPin(place)), [onMapClick])

  const valueLat = value?.position.lat
  const valueLng = value?.position.lng
  const controlled = value !== undefined
  useEffect(() => {
    if (!instance || !controlled) return
    // Cleared, so the next place is new, even the one it held before.
    if (valueLat === undefined || valueLng === undefined) {
      own.current = []
      return
    }
    const place = { lat: valueLat, lng: valueLng }
    const echo = own.current.findLastIndex((mine) => near(mine, place))
    if (echo !== -1) {
      own.current = own.current.slice(echo)
      return
    }
    own.current = [place]
    instance.setView(
      {
        center: place,
        zoom: Math.max(instance.getView().zoom, PLACE_ZOOM)
      },
      { animate: true }
    )
  }, [instance, controlled, valueLat, valueLng])

  const formValue = position
    ? `${position.lat.toFixed(6)},${position.lng.toFixed(6)}`
    : ''
  // A form checks this input, so a required picker with no place stops the
  // submit. It can't take focus, so a check that fails moves to the pin, or
  // to Drop the pin here before there is one.
  const input =
    name !== undefined || isRequired ? (
      <input
        aria-hidden
        tabIndex={-1}
        name={name}
        value={formValue}
        required={isRequired}
        disabled={isDisabled}
        onChange={() => {}}
        onFocus={() => (pinButton.current ?? dropButton.current)?.focus()}
        className='sr-only'
      />
    ) : null
  const formInput = input && formSlot ? createPortal(input, formSlot) : input

  if (!instance) return formInput
  if (!point)
    return (
      <>
        {formInput}
        {/* With no place yet, keyboard users drop the pin at the map's
            centre. Hidden until focused, and pressed through until then. */}
        {!isDisabled && (
          <button
            ref={dropButton}
            type='button'
            data-slot='map-picker-drop'
            className='pointer-events-none absolute top-1/2 left-1/2 z-1 -translate-1/2 emphasis-raised rounded-full px-2 py-0.5 text-xs whitespace-nowrap opacity-0 focus:pointer-events-auto focus:opacity-100'
            onClick={() => {
              const centre = instance.getView().center
              focusPin.current = centre
              choose(centre)
            }}
          >
            Drop the pin here
          </button>
        )}
      </>
    )

  // The pointer's place, from where it sits in the map's frame.
  const placeAt = (event: PointerEvent<HTMLElement>) => {
    const box = frame.current!.getBoundingClientRect()
    return instance.unproject({
      x: event.clientX - box.left,
      y: event.clientY - box.top
    })
  }

  return (
    <>
      {formInput}
      <div
        data-slot='map-picker'
        data-dragging={dragging || undefined}
        className={cn(pinAnchorClass(pin), className)}
        style={{ transform: `translate(${point.x}px, ${point.y}px)` }}
      >
        <button
          ref={pinButton}
          type='button'
          aria-label={labelledBy ? undefined : (label ?? 'Chosen place')}
          aria-labelledby={labelledBy}
          aria-roledescription='movable pin'
          aria-invalid={isInvalid || undefined}
          aria-describedby={describedBy}
          disabled={isDisabled}
          className={cn(
            'is-interactive cursor-grab touch-none data-dragging:cursor-grabbing disabled:cursor-default',
            pinRingClass(pin)
          )}
          data-dragging={dragging || undefined}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId)
            setDragging(true)
          }}
          onPointerMove={(event) => {
            if (dragging) choose(placeAt(event))
          }}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
          onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
            const nudge = NUDGES[event.key]
            if (!nudge) return
            event.preventDefault()
            const step = event.shiftKey ? SHIFT_NUDGE : NUDGE
            choose(
              instance.unproject({
                x: point.x + nudge[0] * step,
                y: point.y + nudge[1] * step
              })
            )
          }}
        >
          <MapPin intent={intent} icon={icon} pin={pin} />
        </button>
      </div>
    </>
  )
}

MapPicker.displayName = 'Map.Picker'

// The pin's own places a value can lag behind, such as through a drag.
const OWN_KEPT = 50
// About 10 metres, so a place rounded to four decimal places is still the
// pin's own.
const NEAR = 1e-4

function near(place: LatLng, other: LatLng) {
  return (
    Math.abs(place.lat - other.lat) <= NEAR &&
    Math.abs(place.lng - other.lng) <= NEAR
  )
}
