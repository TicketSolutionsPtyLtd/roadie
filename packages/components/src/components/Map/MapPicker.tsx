'use client'

import {
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useEffectEvent,
  useRef,
  useState
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { useMapContext } from './MapContext'
import { MapPin, type MapPinLook, pinAnchorClass, pinRingClass } from './MapPin'
import type { LatLng } from './engine'
import { PLACE_ZOOM } from './place'
import { useProjected } from './useProjected'

export type MapPickerProps = MapPinLook & {
  /**
   * The chosen place. `null` is controlled with nothing chosen. When it
   * changes from outside the map, such as from an address search in a form,
   * the map moves to show it at street level. The pin's own place passed
   * back, even rounded to four decimal places or a few moves late, leaves the
   * map where it is.
   */
  value?: LatLng | null
  /** The place chosen at first, when uncontrolled. */
  defaultValue?: LatLng | null
  /** A click or tap on the map dropped the pin, or it was dragged or nudged. */
  onValueChange?: (value: LatLng) => void
  /**
   * Names the pin for screen readers and keyboard users.
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
 * entrance.
 */
export function MapPicker({
  value,
  defaultValue = null,
  onValueChange,
  label = 'Chosen place',
  intent,
  icon,
  pin,
  className
}: MapPickerProps) {
  const { instance, frame, onMapClick } = useMapContext('Map.Picker')
  const [uncontrolled, setUncontrolled] = useState(defaultValue)
  const chosen = value === undefined ? uncontrolled : value
  const point = useProjected(instance, chosen)
  const [dragging, setDragging] = useState(false)

  // The places the pin chose itself that the value hasn't caught up with yet,
  // oldest first, after the place the value last showed. A value near one of
  // them is the pin's own coming back, perhaps rounded or late; any other
  // came from outside the map, so the map goes to show it.
  const own = useRef<LatLng[]>(value ? [value] : [])

  const choose = (place: LatLng) => {
    own.current = [...own.current.slice(1 - OWN_KEPT), place]
    if (value === undefined) setUncontrolled(place)
    onValueChange?.(place)
  }
  const dropPin = useEffectEvent(choose)

  useEffect(() => onMapClick((place) => dropPin(place)), [onMapClick])

  useEffect(() => {
    if (!instance || value === undefined) return
    // Cleared, so the next place is new, even the one it held before.
    if (value === null) {
      own.current = []
      return
    }
    const echo = own.current.findLastIndex((place) => near(place, value))
    if (echo !== -1) {
      own.current = own.current.slice(echo)
      return
    }
    own.current = [value]
    instance.setView(
      {
        center: value,
        zoom: Math.max(instance.getView().zoom, PLACE_ZOOM)
      },
      { animate: true }
    )
  }, [instance, value])

  if (!instance || !point) return null

  // The pointer's place, from where it sits in the map's frame.
  const placeAt = (event: PointerEvent<HTMLElement>) => {
    const box = frame.current!.getBoundingClientRect()
    return instance.unproject({
      x: event.clientX - box.left,
      y: event.clientY - box.top
    })
  }

  return (
    <div
      data-slot='map-picker'
      data-dragging={dragging || undefined}
      className={cn(pinAnchorClass(pin), className)}
      style={{ transform: `translate(${point.x}px, ${point.y}px)` }}
    >
      <button
        type='button'
        aria-label={label}
        aria-roledescription='movable pin'
        className={cn(
          'is-interactive cursor-grab touch-none data-dragging:cursor-grabbing',
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
