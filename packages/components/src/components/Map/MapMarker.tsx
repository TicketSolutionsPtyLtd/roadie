'use client'

import {
  type MouseEventHandler,
  type ReactNode,
  useEffect,
  useId,
  useState
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { RoadieRoutedLink } from '../Link/RoadieRoutedLink'
import { Popover } from '../Popover'
import { useMapContext } from './MapContext'
import { MapPin, type MapPinLook, pinAnchorClass, pinRingClass } from './MapPin'
import { MapPreview } from './MapPreview'
import type { LatLng } from './engine'
import { useProjected } from './useProjected'

export type MapMarkerProps = MapPinLook & {
  /** Where the pin's point sits. */
  position: LatLng
  /** Names the pin for screen readers and keyboard users, such as the venue. */
  label: string
  /** Makes the pin a link. Internal hrefs route through the app's Link. */
  href?: string
  /** Makes the pin a button, such as one that opens a dialog. */
  onClick?: MouseEventHandler<HTMLButtonElement>
  /**
   * A preview of the place, shown above the pin on hover, focus or tap. Put
   * `Popover.Title` and `Popover.Description` or any content in it.
   */
  children?: ReactNode
  className?: string
}

/** A pin on the map. It follows the map as it pans and zooms. */
export function MapMarker({
  position,
  label,
  intent,
  icon,
  pin: graphic,
  href,
  onClick,
  children,
  className
}: MapMarkerProps) {
  const { instance, setPlace } = useMapContext('Map.Marker')
  const point = useProjected(instance, position)
  const [previewOpen, setPreviewOpen] = useState(false)
  const id = useId()
  const { lat, lng } = position
  useEffect(() => {
    setPlace(id, { lat, lng })
    return () => setPlace(id, null)
  }, [id, lat, lng, setPlace])

  // A preview anchored to a moving pin would drift, so moving closes it.
  useEffect(() => {
    if (!instance || !previewOpen) return
    return instance.on('move', () => setPreviewOpen(false))
  }, [instance, previewOpen])

  if (!point) return null
  const pin = <MapPin intent={intent} icon={icon} pin={graphic} />
  const pinButtonClass = cn('is-interactive', pinRingClass(graphic))

  let element: ReactNode
  if (children !== undefined) {
    element = (
      <Popover open={previewOpen} onOpenChange={setPreviewOpen}>
        <Popover.Trigger
          openOnHover
          delay={100}
          aria-label={label}
          onClick={onClick}
          className={pinButtonClass}
        >
          {pin}
        </Popover.Trigger>
        <MapPreview sideOffset={4} onClose={() => setPreviewOpen(false)}>
          {children}
        </MapPreview>
      </Popover>
    )
  } else if (href) {
    element = (
      <RoadieRoutedLink
        href={href}
        aria-label={label}
        className={pinButtonClass}
      >
        {pin}
      </RoadieRoutedLink>
    )
  } else if (onClick) {
    element = (
      <button
        type='button'
        aria-label={label}
        onClick={onClick}
        className={pinButtonClass}
      >
        {pin}
      </button>
    )
  } else {
    element = (
      <span role='img' aria-label={label}>
        {pin}
      </span>
    )
  }

  return (
    <div
      data-slot='map-marker'
      className={cn(pinAnchorClass(graphic), className)}
      style={{ transform: `translate(${point.x}px, ${point.y}px)` }}
    >
      {element}
    </div>
  )
}

MapMarker.displayName = 'Map.Marker'
