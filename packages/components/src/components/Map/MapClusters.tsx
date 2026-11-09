'use client'

import {
  type CSSProperties,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { Popover } from '../Popover'
import { useMapContext } from './MapContext'
import { MapPreview } from './MapPreview'
import {
  type ClusterIndex,
  type MapClusterGroup,
  type MapClusterPoint,
  clusterIndex,
  gridZoom,
  listOf
} from './clusters'
import type { LatLng, MapEngineInstance } from './engine'

export type { MapClusterPoint } from './clusters'

export type MapClustersProps = {
  /**
   * The places and their values. Send totals per postcode or suburb rather
   * than a point per person, so no one's location reaches the browser.
   */
  data: readonly MapClusterPoint[]
  /** Says what the values count, such as "Ticket sales". */
  label: string
  /**
   * Places, by `label`, whose bands take their hover look, such as while a
   * row for that place is hovered in a table beside the map. A place in a
   * group lights its group's band.
   */
  highlight?: string | readonly string[]
  /**
   * Writes a value, such as a currency.
   * @default the reader's number format
   */
  formatValue?: (value: number) => string
  /**
   * Whether the groups are locked, when controlled. Locked, zooming in
   * spreads the bands apart without splitting them.
   */
  locked?: boolean
  /**
   * Whether the groups start locked, when uncontrolled.
   * @default false
   */
  defaultLocked?: boolean
  /** Called when `Map.Toolbar`'s lock button asks to lock or unlock. */
  onLockedChange?: (locked: boolean) => void
  className?: string
}

// Room around the frame for bands whose middle is just outside it.
const BLEED = 64
// A zoom just past where a group splits, so it has split once there.
const PAST_SPLIT = 0.05

const formatNumber = (value: number) => value.toLocaleString()

/**
 * Places and their values, such as ticket sales by postcode, grouped by
 * distance into bands that add up the places near each other. Zooming in
 * splits a group into the groups inside it, down to single places.
 */
export function MapClusters({
  data,
  label,
  highlight,
  formatValue = formatNumber,
  locked: lockedProp,
  defaultLocked = false,
  onLockedChange,
  className
}: MapClustersProps) {
  const { instance, frame, setPlace, addClusterLock } =
    useMapContext('Map.Clusters')
  const index = useMemo(() => clusterIndex(data), [data])

  const [uncontrolledLocked, setUncontrolledLocked] = useState(defaultLocked)
  const locked = lockedProp ?? uncontrolledLocked
  const setLocked = useCallback(
    (next: boolean) => {
      if (lockedProp === undefined) setUncontrolledLocked(next)
      onLockedChange?.(next)
    },
    [lockedProp, onLockedChange]
  )
  useEffect(
    () => addClusterLock({ locked, setLocked }),
    [locked, setLocked, addClusterLock]
  )

  // Locked, the groups stay as they were made at the zoom of the lock,
  // read the first time the bands are laid out once locked.
  const lockedAt = useRef<number | null>(null)

  // Show all fits the map to the data's corners.
  const id = useId()
  const corners = useMemo(() => cornersOf(data), [data])
  useEffect(() => {
    if (!corners) return
    setPlace(`${id}-sw`, corners[0])
    setPlace(`${id}-ne`, corners[1])
    return () => {
      setPlace(`${id}-sw`, null)
      setPlace(`${id}-ne`, null)
    }
  }, [id, corners, setPlace])

  // The bands and where they sit, following the map as it moves. A string
  // means an unchanged layout never re-renders.
  const subscribe = useCallback(
    (onChange: () => void) =>
      instance ? instance.on('move', onChange) : () => {},
    [instance]
  )
  const layoutKey = useSyncExternalStore(
    subscribe,
    () => {
      if (!instance || !frame.current) return ''
      if (!locked) lockedAt.current = null
      else lockedAt.current ??= Math.floor(gridZoom(instance))
      return JSON.stringify(
        layoutOf(instance, frame.current, index, lockedAt.current)
      )
    },
    () => ''
  )
  const layout = useMemo<Layout | null>(
    () => (layoutKey ? (JSON.parse(layoutKey) as Layout) : null),
    [layoutKey]
  )

  const [open, setOpen] = useState<string | null>(null)
  // A preview anchored to a moving band would drift, so moving closes it.
  useEffect(() => {
    if (!instance || open === null) return
    return instance.on('move', () => setOpen(null))
  }, [instance, open])

  // Focus moves to the largest of a group's parts once it splits, at the
  // zoom `at`.
  const bands = useRef(new Map<string, HTMLButtonElement>())
  const focusAfterSplit = useRef<{
    parts: readonly string[]
    at: number
  } | null>(null)
  const hintId = useId()

  // A zoom that stops short of the split, as when the reader zooms away,
  // drops the move, so focus can't jump to a band later.
  useEffect(() => {
    if (!instance) return
    return instance.on('moveend', () => {
      const target = focusAfterSplit.current
      const level = lockedAt.current ?? Math.floor(gridZoom(instance))
      if (target && level < target.at) focusAfterSplit.current = null
    })
  }, [instance])

  const groups = layout?.groups ?? []
  const largest = layout?.largest ?? 0

  // The bands holding a highlighted place.
  const highlighted = useMemo(() => {
    const wanted = typeof highlight === 'string' ? [highlight] : highlight
    if (!wanted?.length || !layout) return new Set<string>()
    return new Set(
      layout.groups
        .filter((group) =>
          index
            .placesIn(group)
            .some(({ names }) => names.some((name) => wanted.includes(name)))
        )
        .map(({ key }) => key)
    )
  }, [highlight, layout, index])

  useEffect(() => {
    const target = focusAfterSplit.current
    if (!target || !layout || layout.level < target.at) return
    focusAfterSplit.current = null
    // Groups are largest first, so this is the largest part on screen.
    const part = groups.find(({ key }) => target.parts.includes(key))
    if (part) bands.current.get(part.key)?.focus()
  })

  if (!instance || !layout) return null

  const split = (group: MapClusterGroup) => {
    if (group.splitsAt === undefined) return
    const { zoom: engineZoom } = instance.getView()
    focusAfterSplit.current = {
      parts: index.partsOf(group),
      at: group.splitsAt
    }
    instance.setView(
      {
        center: group.position,
        zoom: engineZoom + group.splitsAt + PAST_SPLIT - gridZoom(instance)
      },
      { animate: true }
    )
  }

  return (
    <div
      data-slot='map-clusters'
      data-locked={locked || undefined}
      className={cn('contents', className)}
    >
      <span id={hintId} hidden>
        Zooms in to split it
      </span>
      {groups.map((group, rank) => {
        const share = shareOf(group.value, index.total)
        const name = `${label}: ${formatValue(group.value)}, ${share} of all`
        const zooms = !locked && group.splitsAt !== undefined
        return (
          <div
            key={group.key}
            data-slot='map-cluster'
            className='absolute top-0 left-0'
            style={{
              transform: `translate(${group.x}px, ${group.y}px)`,
              zIndex: groups.length - rank
            }}
          >
            <Popover
              open={open === group.key}
              onOpenChange={(next) => {
                if (next && zooms) {
                  split(group)
                  return
                }
                setOpen(next ? group.key : null)
              }}
            >
              <Popover.Trigger
                ref={(element: HTMLButtonElement | null) => {
                  if (element) bands.current.set(group.key, element)
                  else bands.current.delete(group.key)
                }}
                aria-label={name}
                aria-describedby={zooms ? hintId : undefined}
                data-slot='map-cluster-band'
                data-step={stepOf(group.value, largest)}
                data-highlighted={highlighted.has(group.key) || undefined}
                className='is-interactive relative grid aspect-square min-w-11 -translate-1/2 place-content-center rounded-full p-1.5 text-center leading-none tabular-nums'
                style={
                  {
                    '--map-cluster-rest': `var(--chart-heat-${stepOf(group.value, largest)})`,
                    '--map-cluster-hover': `var(--chart-heat-${hoverStepOf(stepOf(group.value, largest))})`,
                    '--map-cluster-spread': `${spreadOf(group.value, largest)}px`
                  } as CSSProperties
                }
              >
                <span className='text-sm font-medium'>
                  {formatValue(group.value)}
                </span>
                <span className='text-xs opacity-75'>{share}</span>
              </Popover.Trigger>
              <MapPreview sideOffset={8} onClose={() => setOpen(null)}>
                {open === group.key && (
                  <GroupPreview
                    index={index}
                    group={group}
                    label={label}
                    share={share}
                    formatValue={formatValue}
                  />
                )}
              </MapPreview>
            </Popover>
          </div>
        )
      })}
    </div>
  )
}

MapClusters.displayName = 'Map.Clusters'

/** A group's total, share and places, as a band's preview. */
function GroupPreview({
  index,
  group,
  label,
  share,
  formatValue
}: {
  index: ClusterIndex
  group: MapClusterGroup
  label: string
  share: string
  formatValue: (value: number) => string
}) {
  const places = index.placesIn(group)
  const named = places.flatMap((place) => (place.label ? [place.label] : []))
  const shown = named.slice(0, 3)
  const more = places.length - shown.length
  const reach = Math.max(
    0,
    ...places.map(({ position }) => kilometres(group.position, position))
  )
  return (
    <Popover.Header>
      <Popover.Title>
        {label}: {formatValue(group.value)}
      </Popover.Title>
      <Popover.Description>
        {share} of all
        {places.length > 1 && reach >= 1
          ? `, within ${Math.round(reach)} km`
          : ''}
      </Popover.Description>
      {shown.length > 0 && (
        <p className='text-sm text-subtle'>
          {more > 0 ? `${shown.join(', ')} and ${more} more` : listOf(shown)}
        </p>
      )}
    </Popover.Header>
  )
}

/** A share of the total, as a whole percentage, or under 1%. */
function shareOf(value: number, total: number) {
  if (total <= 0) return '0%'
  const percent = (value / total) * 100
  if (percent > 0 && percent < 0.5) return '<1%'
  return `${Math.round(percent)}%`
}

// Bands step from the fifth heat colour to the last, the strongest against
// the basemap in light and dark, as their value nears the largest group's.
// Below the fifth, light mode's fills are too pale for white text.
// On hover, a band takes the next heat colour, as Roadie's strong fills
// take the next step of their scale; the strongest takes the one before.
function hoverStepOf(step: number) {
  return step === 8 ? 7 : step + 1
}

function stepOf(value: number, largest: number) {
  if (largest <= 0) return 4
  return 4 + Math.round((4 * value) / largest)
}

// The rings spread from 6px to 18px with a group's value, by area.
function spreadOf(value: number, largest: number) {
  if (largest <= 0) return 6
  return Math.round(6 + 12 * Math.sqrt(value / largest))
}

type Layout = {
  /** The zoom the groups are made at. */
  level: number
  /** The largest group's value at this zoom, anywhere on the map. */
  largest: number
  /** The groups in view, largest first, at whole pixels in the frame. */
  groups: (MapClusterGroup & { x: number; y: number })[]
}

/** The groups in view, at the lock's zoom or the map's, and where they sit. */
function layoutOf(
  instance: MapEngineInstance,
  frame: HTMLElement,
  index: ClusterIndex,
  lockedAt: number | null
): Layout {
  const level = lockedAt ?? Math.floor(gridZoom(instance))
  return {
    level,
    largest: index.largestAt(level),
    groups: index
      .groupsAt(boundsOf(instance, frame), level)
      .sort((a, b) => b.value - a.value)
      .map((group) => {
        const { x, y } = instance.project(group.position)
        return { ...group, x: Math.round(x), y: Math.round(y) }
      })
  }
}

/** The frame's bounds, a band's width past each edge, for grouping. */
function boundsOf(
  instance: MapEngineInstance,
  frame: HTMLElement
): [number, number, number, number] {
  const { clientWidth: width, clientHeight: height } = frame
  // Before the frame has a size, every group.
  if (width === 0 || height === 0) return [-180, -85, 180, 85]
  const northWest = instance.unproject({ x: -BLEED, y: -BLEED })
  const southEast = instance.unproject({ x: width + BLEED, y: height + BLEED })
  const south = Math.max(-85, southEast.lat)
  const north = Math.min(85, northWest.lat)
  // Across the date line, or showing the whole world, every longitude.
  const wraps =
    northWest.lng > southEast.lng || southEast.lng - northWest.lng >= 360
  return wraps
    ? [-180, south, 180, north]
    : [
        Math.max(-180, northWest.lng),
        south,
        Math.min(180, southEast.lng),
        north
      ]
}

function cornersOf(
  data: readonly MapClusterPoint[]
): [LatLng, LatLng] | undefined {
  if (data.length === 0) return undefined
  const lats = data.map(({ position }) => position.lat)
  const lngs = data.map(({ position }) => position.lng)
  return [
    { lat: Math.min(...lats), lng: Math.min(...lngs) },
    { lat: Math.max(...lats), lng: Math.max(...lngs) }
  ]
}

/** How far apart two places are on the ground, in km. */
function kilometres(from: LatLng, to: LatLng) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180
  const dLat = radians(to.lat - from.lat)
  const dLng = radians(to.lng - from.lng)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(from.lat)) *
      Math.cos(radians(to.lat)) *
      Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(a))
}
