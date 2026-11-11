'use client'

import {
  type CSSProperties,
  useCallback,
  useEffect,
  useEffectEvent,
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
  gridLevel,
  gridZoom,
  listOf
} from './clusters'
import type { LatLng, MapEngineInstance } from './engine'

export type { MapClusterPoint } from './clusters'

/** A band on the map, as `onGroupsChange` gives it. */
export type MapClusterBand = {
  /** Where the band sits: the middle of its places. */
  position: LatLng
  /** The sum of its places' values. */
  value: number
  /** Its share of every value in `data`, from 0 to 1. */
  share: number
  /** Its places, largest first. */
  places: { position: LatLng; value: number; label?: string }[]
}

export type MapClustersProps = {
  /**
   * The places and their values. Send totals per postcode or suburb rather
   * than a point per person, so no one's location reaches the browser.
   */
  data: readonly MapClusterPoint[]
  /** Says what the values count, such as "Total". */
  label: string
  /**
   * Places, by `label`, whose bands take their hover look, such as while a
   * row for that place is hovered in a table beside the map. A place in a
   * group lights its group's band.
   */
  highlight?: string | readonly string[]
  /**
   * Called with the bands on the map, largest first, whenever they change
   * as the map moves, such as to list what the map shows in a table beside
   * it.
   */
  onGroupsChange?: (bands: MapClusterBand[]) => void
  /**
   * Writes a value, such as a currency.
   * @default the reader's number format
   */
  formatValue?: (value: number) => string
  /**
   * Keeps the groups as they are: zooming in spreads the bands apart
   * without splitting them, and clicking a band opens its preview. Put the
   * control that sets it beside what lists the groups, such as a table.
   * @default false
   */
  locked?: boolean
  /**
   * What each band shows: its value and, below it, its share of every value
   * in `data`, or only one. Its name always holds both.
   * @default 'both'
   */
  show?: 'both' | 'value' | 'share'
  /**
   * Keys the colours in the map's bottom corner, from nothing to the largest
   * band at this zoom. Colours compare bands at one zoom, so the top of the
   * key changes as the map zooms.
   * @default false
   */
  legend?: boolean
  className?: string
}

// Room around the frame for bands whose middle is just outside it.
const BLEED = 64
// A zoom just past where a group splits, so it has split once there.
const PAST_SPLIT = 0.05

const formatNumber = (value: number) => value.toLocaleString()

/**
 * Places and their values, such as totals by postcode, grouped by
 * distance into bands that add up the places near each other. Zooming in
 * splits a group into the groups inside it, down to single places.
 */
export function MapClusters({
  data,
  label,
  highlight,
  onGroupsChange,
  formatValue = formatNumber,
  locked = false,
  legend = false,
  show = 'both',
  className
}: MapClustersProps) {
  const { instance, frame, setPlace } = useMapContext('Map.Clusters')
  const index = useMemo(() => clusterIndex(data), [data])

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
      else lockedAt.current ??= gridLevel(instance)
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
  const layer = useRef<HTMLDivElement>(null)
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
      const level = lockedAt.current ?? gridLevel(instance)
      if (target && level < target.at) focusAfterSplit.current = null
    })
  }, [instance])

  const groups = layout?.groups ?? []
  const largest = layout?.largest ?? 0

  // Tells the app the bands on the map when they change, not on every
  // frame of a move.
  const shownKeys = layout?.groups.map(({ key }) => key).join(' ') ?? null
  const reportGroups = useEffectEvent(() => {
    if (!layout || !onGroupsChange) return
    onGroupsChange(
      layout.groups.map((group) => ({
        position: group.position,
        value: group.value,
        share: index.total > 0 ? group.value / index.total : 0,
        places: index
          .placesIn(group)
          .map(({ position, value, label }) => ({ position, value, label }))
      }))
    )
  })
  useEffect(() => {
    if (shownKeys !== null) reportGroups()
  }, [shownKeys, index])

  // The bands holding a highlighted place. A spot several places share goes
  // by any of their names, or by its label, as `onGroupsChange` gives it.
  // It reads every place in view, so it follows the bands shown, not each
  // frame of a move.
  const highlighted = useMemo(() => {
    const wanted = typeof highlight === 'string' ? [highlight] : highlight
    if (!wanted?.length || !shownKeys) return new Set<string>()
    return new Set(
      shownKeys
        .split(' ')
        .filter((key) =>
          index
            .placesIn({ key })
            .some(
              ({ names, label }) =>
                names.some((name) => wanted.includes(name)) ||
                (label !== undefined && wanted.includes(label))
            )
        )
    )
  }, [highlight, shownKeys, index])

  useEffect(() => {
    const target = focusAfterSplit.current
    if (!target || !layout || layout.level < target.at) return
    focusAfterSplit.current = null
    // The split band took its focus with it, to the page or to what holds
    // the map. Focus the reader moved elsewhere meanwhile stays there.
    const active = document.activeElement
    if (active && !active.contains(layer.current)) return
    // Groups are largest first, so this is the largest part on screen.
    const part = groups.find(({ key }) => target.parts.includes(key))
    if (part) bands.current.get(part.key)?.focus()
  })

  if (!instance || !layout) return null

  const split = (group: MapClusterGroup) => {
    if (group.splitsAt === undefined) return
    const { zoom: engineZoom } = instance.getView()
    instance.setView(
      {
        center: group.position,
        zoom: engineZoom + group.splitsAt + PAST_SPLIT - gridZoom(instance)
      },
      { animate: true }
    )
    // Set once the move has started: a click during a move ends that move
    // first, short of this split, which would drop the focus.
    focusAfterSplit.current = {
      parts: index.partsOf(group),
      at: group.splitsAt
    }
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
      {/* The bands stack among themselves, under the map's controls. */}
      <div
        ref={layer}
        data-slot='map-cluster-bands'
        className='absolute top-0 left-0 z-1'
      >
        {groups.map((group, rank) => {
          const share = shareOf(group.value, index.total)
          const name = `${label}: ${formatValue(group.value)}, ${share} of all`
          const zooms = !locked && group.splitsAt !== undefined
          const band = {
            ref: (element: HTMLButtonElement | null) => {
              if (element) bands.current.set(group.key, element)
              else bands.current.delete(group.key)
            },
            'aria-label': name,
            'data-slot': 'map-cluster-band',
            'data-level': levelOf(group.value, largest),
            'data-highlighted': highlighted.has(group.key) || undefined,
            className:
              'is-interactive relative grid aspect-square min-w-(--map-cluster-size) -translate-1/2 place-content-center rounded-full p-1.5 text-center leading-none tabular-nums select-none',
            style: {
              '--map-cluster-size': `${sizeOf(group.value, largest)}px`,
              '--map-cluster-spread': `${spreadOf(group.value, largest)}px`
            } as CSSProperties
          }
          const text = (
            <>
              {show !== 'share' && (
                <span className='text-sm font-medium'>
                  {formatValue(group.value)}
                </span>
              )}
              {show !== 'value' && (
                <span
                  className={cn(
                    show === 'both'
                      ? 'text-xs opacity-75'
                      : 'text-sm font-medium'
                  )}
                >
                  {share}
                </span>
              )}
            </>
          )
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
              {zooms ? (
                // A band that zooms opens nothing, so it's a plain button.
                <button
                  type='button'
                  {...band}
                  aria-describedby={hintId}
                  onClick={() => split(group)}
                >
                  {text}
                </button>
              ) : (
                <Popover
                  open={open === group.key}
                  onOpenChange={(next) => setOpen(next ? group.key : null)}
                >
                  <Popover.Trigger {...band}>{text}</Popover.Trigger>
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
              )}
            </div>
          )
        })}
      </div>
      {legend && (
        <ClusterLegend
          label={label}
          largest={formatValue(largest)}
          none={formatValue(0)}
        />
      )}
    </div>
  )
}

MapClusters.displayName = 'Map.Clusters'

const LEGEND_LEVELS = [0, 1, 2, 3, 4]

/**
 * The heat colours from an empty band to the largest. The bands' names
 * carry their values, so screen readers skip it.
 */
function ClusterLegend({
  label,
  largest,
  none
}: {
  label: string
  largest: string
  none: string
}) {
  return (
    <div
      data-slot='map-cluster-legend'
      aria-hidden
      className='pointer-events-none absolute z-10 grid gap-1 rounded-lg is-translucent bg-raised px-2 py-1.5 text-xs text-subtle tabular-nums'
    >
      <p className='font-medium text-normal'>{label}</p>
      <div className='flex'>
        {LEGEND_LEVELS.map((level) => (
          <span
            key={level}
            data-slot='map-cluster-legend-swatch'
            data-level={level}
            className='h-2 w-5 first:rounded-s-full last:rounded-e-full'
          />
        ))}
      </div>
      <div className='flex justify-between gap-2'>
        <span>{none}</span>
        <span>{largest}</span>
      </div>
    </div>
  )
}

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
  const reach = places.reduce(
    (far, { position }) => Math.max(far, kilometres(group.position, position)),
    0
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

// A band's heat level, from 0 for nothing to 4 for the largest, which the
// stylesheet colours in each mode.
function levelOf(value: number, largest: number) {
  if (largest <= 0) return 0
  return Math.round((4 * value) / largest)
}

// Bands grow a little with their value, by area, from a touch target.
function sizeOf(value: number, largest: number) {
  if (largest <= 0) return 44
  return Math.round(44 + 20 * Math.sqrt(value / largest))
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
  const level = lockedAt ?? gridLevel(instance)
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
  // A loop, since a point for each sale can be more points than a call
  // takes arguments. A point with no position has no corner to add.
  let south = Infinity
  let west = Infinity
  let north = -Infinity
  let east = -Infinity
  for (const { position } of data) {
    if (!Number.isFinite(position.lat) || !Number.isFinite(position.lng))
      continue
    south = Math.min(south, position.lat)
    north = Math.max(north, position.lat)
    west = Math.min(west, position.lng)
    east = Math.max(east, position.lng)
  }
  if (south > north) return undefined
  return [
    { lat: south, lng: west },
    { lat: north, lng: east }
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
