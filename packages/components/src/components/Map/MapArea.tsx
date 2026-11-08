'use client'

import { type ReactNode, useEffect, useId, useRef, useState } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { type RoadieIntent, intentVariants } from '../../variants'
import { Popover } from '../Popover'
import { useMapContext } from './MapContext'
import { MapPreview } from './MapPreview'
import type { LatLng, MapAreaGeometry } from './engine'
import { areaCentre, areaContains } from './geometry'
import { readColor } from './palette'
import { useProjected } from './useProjected'

export type MapAreaProps = {
  /**
   * The area, as a GeoJSON polygon or multipolygon. Its coordinates are
   * `[lng, lat]`, longitude first, as GeoJSON is.
   */
  area: MapAreaGeometry
  /** Names the area for screen readers and keyboard users. */
  label: string
  /** Colours the area. Without it, it follows the surrounding intent. */
  intent?: RoadieIntent
  /**
   * A preview of the area, shown where it's clicked or tapped, or at its
   * middle from the keyboard.
   */
  children?: ReactNode
}

// The fill is a light wash, stronger while the pointer is over it or its
// preview is open; the outline is the intent's solid step.
const FILL = 0.18
const FILL_ACTIVE = 0.32

/** Highlights an area on the map, such as a venue's site or a precinct. */
export function MapArea({ area, label, intent, children }: MapAreaProps) {
  const id = useId()
  const { instance, frame, setArea, onMapClick } = useMapContext('Map.Area')
  const colourProbe = useRef<HTMLSpanElement>(null)
  const [hovered, setHovered] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [anchor, setAnchor] = useState<LatLng>(() => areaCentre(area))
  const [colour, setColour] = useState<string | null>(null)
  const interactive = children !== undefined
  const point = useProjected(instance, anchor)

  // The intent's solid step, read where the area sits, again on a mode change.
  useEffect(() => {
    const probe = colourProbe.current
    if (!probe) return
    const read = () => setColour(readColor(probe, '--intent-9'))
    read()
    const watcher = new MutationObserver(read)
    watcher.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme']
    })
    return () => watcher.disconnect()
  }, [intent])

  useEffect(() => {
    if (!colour) return
    setArea(id, {
      id,
      geometry: area,
      fill: colour,
      fillOpacity: hovered || previewOpen ? FILL_ACTIVE : FILL,
      line: colour
    })
  }, [id, area, colour, hovered, previewOpen, setArea])
  useEffect(() => () => setArea(id, null), [id, setArea])

  // A click or tap inside the area opens its preview there.
  useEffect(() => {
    if (!interactive) return
    return onMapClick((place) => {
      if (!areaContains(area, place)) return
      setAnchor(place)
      setPreviewOpen(true)
    })
  }, [onMapClick, interactive, area])

  // A preview anchored to a moving map would drift, so moving closes it.
  useEffect(() => {
    if (!instance || !previewOpen) return
    return instance.on('move', () => setPreviewOpen(false))
  }, [instance, previewOpen])

  // The pointer over the area strengthens it and shows a pointer cursor.
  useEffect(() => {
    const element = frame.current
    if (!instance || !element || !interactive) return
    const track = (event: PointerEvent) => {
      const box = element.getBoundingClientRect()
      const place = instance.unproject({
        x: event.clientX - box.left,
        y: event.clientY - box.top
      })
      setHovered(areaContains(area, place))
    }
    const leave = () => setHovered(false)
    element.addEventListener('pointermove', track)
    element.addEventListener('pointerleave', leave)
    return () => {
      element.removeEventListener('pointermove', track)
      element.removeEventListener('pointerleave', leave)
    }
  }, [instance, frame, interactive, area])

  useEffect(() => {
    const element = frame.current
    if (!element || !hovered) return
    element.toggleAttribute('data-area-hover', true)
    return () => {
      element.toggleAttribute('data-area-hover', false)
    }
  }, [frame, hovered])

  return (
    <>
      <span
        ref={colourProbe}
        hidden
        className={cn(intent && intentVariants[intent])}
      />
      {interactive && point && (
        <Popover
          open={previewOpen}
          onOpenChange={(open) => {
            if (open) setAnchor(areaCentre(area))
            setPreviewOpen(open)
          }}
        >
          {/* Hidden until it has keyboard focus, when it shows the label. */}
          <Popover.Trigger
            data-slot='map-area-trigger'
            className='absolute top-0 left-0 z-1 -translate-1/2 emphasis-raised rounded-full px-2 py-0.5 text-xs whitespace-nowrap opacity-0 focus-visible:opacity-100'
            style={{ transform: `translate(${point.x}px, ${point.y}px)` }}
          >
            {label}
          </Popover.Trigger>
          <MapPreview sideOffset={8} onClose={() => setPreviewOpen(false)}>
            {children}
          </MapPreview>
        </Popover>
      )}
    </>
  )
}

MapArea.displayName = 'Map.Area'
