'use client'

import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'

import {
  BoundingBoxIcon,
  CornersInIcon,
  CornersOutIcon,
  CrosshairSimpleIcon,
  MinusIcon,
  PlusIcon
} from '@phosphor-icons/react'

import { cn } from '@oztix/roadie-core/utils'

import { IconButton } from '../Button'
import { Toggle } from '../Toggle'
import { Toolbar } from '../Toolbar'
import { useMapContext } from './MapContext'
import { MapControl } from './MapControl'
import type { LatLng } from './engine'
import { useProjected } from './useProjected'

export type MapToolbarProps = {
  /**
   * Adds a button that centres the map on the reader's location, after the
   * browser asks their permission.
   * @default false
   */
  locate?: boolean
  /**
   * Adds a button that makes the map fill the window, and another press, or
   * Escape, puts it back. Offer it on maps people explore. While the map
   * fills the window, the toolbar shows the way back either way.
   * @default false
   */
  expand?: boolean
  /**
   * Adds Show all, which fits the map to every pin and area on it. It's
   * turned off while the map has none.
   * @default false
   */
  fit?: boolean
  /**
   * More `Toolbar.Button`s, such as for layers, joined in their own toolbar
   * below the zoom buttons.
   */
  children?: ReactNode
  className?: string
}

type Locating = 'off' | 'busy' | 'on' | 'unavailable'

// Close enough to see the streets around the reader.
const LOCATED_ZOOM = 15

/**
 * Zoom buttons, joined, and optionally Show all, my location, full screen
 * and an app's own buttons, in the map's top corner.
 */
export function MapToolbar({
  locate = false,
  expand = false,
  fit = false,
  children,
  className
}: MapToolbarProps) {
  const { instance, expanded, addToolbar, fitTo, canFit } =
    useMapContext('Map.Toolbar')
  useEffect(addToolbar, [addToolbar])
  const [here, setHere] = useState<LatLng | null>(null)
  const [locating, setLocating] = useState<Locating>('off')
  const following = locating === 'busy' || locating === 'on'
  // The watch, and the location service that started it, which clears it.
  const watch = useRef<{ id: number; service: Geolocation } | null>(null)

  const stopWatching = useCallback(() => {
    if (!watch.current) return
    watch.current.service.clearWatch(watch.current.id)
    watch.current = null
  }, [])
  useEffect(() => stopWatching, [stopWatching])

  const zoomBy = (step: number) => {
    if (!instance) return
    instance.setView(
      { zoom: instance.getView().zoom + step },
      { animate: true }
    )
  }

  // The first fix centres the map on the reader; later ones move the dot,
  // so the map stays where they pan it. A second press stops following.
  const toggleMyLocation = () => {
    if (following) {
      stopWatching()
      setHere(null)
      setLocating('off')
      return
    }
    const service = navigator.geolocation as Geolocation | undefined
    if (!instance || !service) {
      setLocating('unavailable')
      return
    }
    setLocating('busy')
    let found = false
    const id = service.watchPosition(
      ({ coords }) => {
        const place = { lat: coords.latitude, lng: coords.longitude }
        setHere(place)
        setLocating('on')
        if (found) return
        found = true
        instance.setView(
          {
            center: place,
            zoom: Math.max(instance.getView().zoom, LOCATED_ZOOM)
          },
          { animate: true }
        )
      },
      (error) => {
        // A fix that's slow to come back keeps the last dot; a refusal, or
        // no fix at all, stops.
        if (found && error.code !== error.PERMISSION_DENIED) return
        stopWatching()
        setHere(null)
        setLocating('unavailable')
      },
      { enableHighAccuracy: true, maximumAge: 10_000 }
    )
    watch.current = { id, service }
  }

  return (
    <>
      {/* Base UI's scroll area sets its own position, so a wrapper places it,
          clear of a notch while the map fills the window (map.css). */}
      <div
        className={cn(
          'absolute top-(--map-inset-top) right-(--map-inset-right) z-10 flex flex-col items-end gap-2',
          className
        )}
      >
        <Toolbar orientation='vertical' size='sm' aria-label='Zoom'>
          <Toolbar.Button aria-label='Zoom in' onClick={() => zoomBy(1)}>
            <PlusIcon weight='bold' className='size-4' />
          </Toolbar.Button>
          <Toolbar.Button aria-label='Zoom out' onClick={() => zoomBy(-1)}>
            <MinusIcon weight='bold' className='size-4' />
          </Toolbar.Button>
        </Toolbar>
        {fit && (
          <MapControl>
            <IconButton
              size='sm'
              emphasis='subtler'
              aria-label='Show all'
              disabled={!canFit}
              onClick={() => fitTo()}
            >
              <BoundingBoxIcon weight='bold' className='size-4' />
            </IconButton>
          </MapControl>
        )}
        {locate && (
          <MapControl>
            <Toggle
              size='sm'
              emphasis='subtler'
              aria-label='Show my location'
              aria-busy={locating === 'busy' || undefined}
              pressed={following}
              onPressedChange={toggleMyLocation}
            >
              <CrosshairSimpleIcon
                weight={following ? 'fill' : 'bold'}
                className='size-4'
              />
            </Toggle>
          </MapControl>
        )}
        {/* Read out as it changes, and shown while there's something to say. */}
        <p
          role='status'
          className={
            locating === 'unavailable'
              ? 'max-w-48 rounded-lg emphasis-floating px-2 py-1 text-sm'
              : 'sr-only'
          }
        >
          {locating === 'unavailable' ? 'Your location isn’t available' : ''}
        </p>
        {(expand || expanded) && <MapExpandButton />}
        {children && (
          <Toolbar orientation='vertical' size='sm' aria-label='Map controls'>
            {children}
          </Toolbar>
        )}
      </div>
      {here && <MapUserLocation position={here} />}
    </>
  )
}

/** Fills the window, or puts the map back, on its own surface. */
export function MapExpandButton() {
  const { expanded, setExpanded } = useMapContext('Map.Toolbar')
  return (
    <MapControl>
      <IconButton
        size='sm'
        emphasis='subtler'
        aria-label={expanded ? 'Exit full screen' : 'Full screen'}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <CornersInIcon weight='bold' className='size-4' />
        ) : (
          <CornersOutIcon weight='bold' className='size-4' />
        )}
      </IconButton>
    </MapControl>
  )
}

/** The reader's location, as a dot with a pulse around it. */
function MapUserLocation({ position }: { position: LatLng }) {
  const { instance } = useMapContext('Map.Toolbar')
  const point = useProjected(instance, position)
  if (!point) return null
  return (
    <span
      data-slot='map-user-location'
      className='absolute top-0 left-0 z-1 grid intent-brand-blue'
      style={{ transform: `translate(${point.x}px, ${point.y}px)` }}
    >
      <span
        aria-hidden
        data-slot='map-user-location-pulse'
        className='col-start-1 row-start-1 size-4 -translate-1/2 emphasis-strong rounded-full'
      />
      <span
        role='img'
        aria-label='Your location'
        className='col-start-1 row-start-1 size-4 -translate-1/2 emphasis-strong rounded-full border-2 border-inverted shadow-md'
      />
    </span>
  )
}

MapToolbar.displayName = 'Map.Toolbar'
