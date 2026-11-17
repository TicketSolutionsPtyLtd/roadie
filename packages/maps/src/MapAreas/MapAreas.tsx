'use client'

import {
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { useMapContext } from '../Map/MapContext'
import type {
  LatLng,
  MapAreaLayer,
  MapBounds,
  MapEngineInstance,
  MapPixel
} from '../Map/engine'
import { type AreaBox, areaBox, areaContains, wrapLng } from '../Map/geometry'
import { readColor } from '../Map/palette'
import { LEVELS, classStarts, levelOf, rangesOf } from './steps'
import {
  type MapAreaCollection,
  type MapAreaFeature,
  type MapAreaTopology,
  areaFeatures
} from './topology'

/** An area's value, such as a postcode's total. */
export type MapAreaValue = {
  /** The area's id in `areas`, such as its postcode. */
  id: string
  value: number
  /** Names the area. Without it, its id does. */
  label?: string
}

/** An area on the map, as `onAreasChange` gives it. */
export type MapAreaInView = {
  id: string
  label: string
  value: number
  /** Its share of every value in `data`, from 0 to 1. */
  share: number
}

export type MapAreasProps = {
  /**
   * The boundaries, as GeoJSON or TopoJSON, each with an id such as its
   * postcode. TopoJSON stores shared borders once, so it's smaller. Load
   * them once and keep the same object, as reading them again redraws
   * every area.
   */
  areas: MapAreaCollection | MapAreaTopology
  /**
   * The property that holds each area's id, when it isn't the area's own
   * `id`, such as `POA_CODE21`.
   */
  idProperty?: string
  /**
   * The areas' values. Areas with no value, or a value of 0 or less, aren't
   * drawn, so the map shows through. Rows with the same id add up. Send
   * totals per area, never a row per person. The same values in a new array
   * draw nothing again.
   */
  data: readonly MapAreaValue[]
  /** Says what the values count, such as "Total". */
  label: string
  /**
   * Areas, by id, that take their hover look, such as while a row for that
   * area is hovered in a table beside the map.
   */
  highlight?: string | readonly string[]
  /**
   * Called with the areas on the map that have values, largest first, when
   * the map settles after moving and they have changed, such as to list them
   * in a table.
   */
  onAreasChange?: (areas: MapAreaInView[]) => void
  /**
   * Writes a value, such as a currency.
   * @default the reader's number format
   */
  formatValue?: (value: number) => string
  /**
   * Keys the colours in the map's bottom corner. Each colour holds a fifth
   * of the areas with values, so the key gives each colour's range.
   * @default false
   */
  legend?: boolean
  className?: string
}

const FILL = 0.62
const FILL_ACTIVE = 0.88
const LINE = 0.5
const LINE_ACTIVE = 2.5
// Between the pointer and the label beside it.
const TIP_GAP = 12

const formatNumber = (value: number) => value.toLocaleString()

type Shape = MapAreaFeature & { box: AreaBox }

const NONE: readonly string[] = []

/**
 * Areas, such as postcodes, filled in heat colours by their values. Use it
 * in place of `MapClusters` when values belong to areas rather than points.
 * Each area shows where its value comes from, at every zoom.
 */
export function MapAreas({
  areas,
  idProperty,
  data: given,
  label,
  highlight,
  onAreasChange,
  formatValue = formatNumber,
  legend = false,
  className
}: MapAreasProps) {
  const uid = useId()
  const { instance, frame, setArea, setActiveAreas, onMapClick } =
    useMapContext('MapAreas')
  const data = useSameValues(given)

  const shapes = useMemo(
    () => new Map(areaFeatures(areas, { idProperty }).map(withBox)),
    [areas, idProperty]
  )
  const values = useMemo(() => {
    // Rows with the same id add up. The total is of every value given, so a
    // share matches a list that also holds ids with no boundary.
    const byId = new Map<string, MapAreaValue>()
    let total = 0
    for (const row of data) {
      if (!(row.value > 0) || !Number.isFinite(row.value)) continue
      total += row.value
      if (!shapes.has(row.id)) continue
      const known = byId.get(row.id)
      byId.set(
        row.id,
        known
          ? {
              ...known,
              value: known.value + row.value,
              label: known.label ?? row.label
            }
          : row
      )
    }
    const all = [...byId.values()].map(({ value }) => value)
    return {
      byId,
      total,
      all,
      starts: classStarts(all),
      // Not spread into `Math.max`, which has a limit on its arguments.
      largest: all.reduce((most, value) => Math.max(most, value), 0)
    }
  }, [data, shapes])

  // Each step's rest and hover colours, read where the map sits, again when
  // the mode changes.
  const [colours, setColours] = useState<{ rest: string; hover: string }[]>([])
  useEffect(() => {
    const element = frame.current
    if (!element) return
    const read = () => setColours(levelColours(element))
    read()
    const watcher = new MutationObserver(read)
    watcher.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme']
    })
    return () => watcher.disconnect()
  }, [frame])

  const [hovered, setHovered] = useState<{
    id: string
    at: MapPixel
  } | null>(null)
  // By id, so a pointer moving inside one area lights it once, and as a
  // key, so the same ids in a new array light nothing again.
  const hoveredId = hovered?.id
  const litKey = JSON.stringify(
    [...new Set([highlight ?? [], hoveredId ?? []].flat())].filter((id) =>
      values.byId.has(id)
    )
  )
  const lit = useMemo(
    () => (JSON.parse(litKey) as string[]).map((id) => `${uid}${id}`),
    [litKey, uid]
  )
  useEffect(() => {
    setActiveAreas(uid, lit)
  }, [uid, lit, setActiveAreas])
  useEffect(() => () => setActiveAreas(uid, null), [uid, setActiveAreas])

  // Every area with a value, as one set, so the engine draws them together.
  // An engine that can't restyle one area gets them all again with the
  // active ones changed.
  const redrawn = instance?.setActiveAreas ? NONE : lit
  const layers = useMemo((): MapAreaLayer[] => {
    if (colours.length === 0) return []
    const active = new Set(redrawn)
    return [...values.byId.values()].map(({ id, value }) => {
      const { rest, hover } = colours[levelOf(value, values.starts)]!
      const on = active.has(`${uid}${id}`)
      return {
        id: `${uid}${id}`,
        geometry: shapes.get(id)!.geometry,
        fill: rest,
        fillOpacity: on ? FILL_ACTIVE : FILL,
        fillOpacityActive: FILL_ACTIVE,
        line: hover,
        lineWidth: on ? LINE_ACTIVE : LINE,
        lineWidthActive: LINE_ACTIVE
      }
    })
  }, [colours, values, shapes, uid, redrawn])
  useEffect(() => {
    setArea(uid, layers)
  }, [uid, layers, setArea])
  useEffect(() => () => setArea(uid, null), [uid, setArea])

  // The area under the pointer, a frame after it moves.
  useEffect(() => {
    const element = frame.current
    if (!instance || !element) return
    let frameRequest = 0
    const track = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      cancelAnimationFrame(frameRequest)
      // Over a control or a pin, the pointer isn't on the map.
      const onMap =
        event.target instanceof Element &&
        event.target.closest('[data-slot=map-surface]')
      if (!onMap) return setHovered(null)
      frameRequest = requestAnimationFrame(() => {
        const box = element.getBoundingClientRect()
        const at = { x: event.clientX - box.left, y: event.clientY - box.top }
        const id = areaAt(instance.unproject(at), values.byId, shapes)
        setHovered(id ? { id, at } : null)
      })
    }
    const leave = () => {
      cancelAnimationFrame(frameRequest)
      setHovered(null)
    }
    element.addEventListener('pointermove', track)
    element.addEventListener('pointerleave', leave)
    return () => {
      cancelAnimationFrame(frameRequest)
      element.removeEventListener('pointermove', track)
      element.removeEventListener('pointerleave', leave)
    }
  }, [instance, frame, values, shapes])
  // A finger can't hover, so a tap shows an area's label, and a tap
  // elsewhere takes it away.
  useEffect(
    () =>
      onMapClick((place) => {
        const id = areaAt(place, values.byId, shapes)
        setHovered(id && instance ? { id, at: instance.project(place) } : null)
      }),
    [onMapClick, instance, values, shapes]
  )
  // A moving map takes the area away from under the label.
  useEffect(() => instance?.on('move', () => setHovered(null)), [instance])

  // Beside the pointer, on the side with room, so the map's edge never cuts
  // the label off.
  const tipElement = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const element = tipElement.current
    const viewport = frame.current
    if (!element || !viewport || !hovered) return
    const beside = (pointer: number, size: number, room: number) =>
      pointer + TIP_GAP + size > room
        ? Math.max(0, pointer - TIP_GAP - size)
        : pointer + TIP_GAP
    const x = beside(hovered.at.x, element.offsetWidth, viewport.clientWidth)
    const y = beside(hovered.at.y, element.offsetHeight, viewport.clientHeight)
    element.style.transform = `translate(${x}px, ${y}px)`
  })

  // The areas in view, as the map settles. Only a changed list is reported:
  // an app that keeps it in state renders again, and would otherwise be told
  // the same list each time it did.
  const reported = useRef<MapAreaInView[] | undefined>(undefined)
  const report = useEffectEvent(() => {
    const element = frame.current
    if (!onAreasChange || !instance || !element) return
    const view = viewBounds(instance, element)
    const inView = [...values.byId.values()]
      .filter(({ id }) => overlaps(shapes.get(id)!.box, view))
      .map(({ id, value, label: name }) => ({
        id,
        label: name ?? id,
        value,
        share: value / values.total
      }))
      .sort((a, b) => b.value - a.value)
    if (reported.current && sameAreas(reported.current, inView)) return
    reported.current = inView
    onAreasChange(inView)
  })
  useEffect(() => {
    if (!instance) return
    report()
    return instance.on('moveend', report)
  }, [instance, values])

  const tip = hovered && values.byId.get(hovered.id)
  return (
    <div data-slot='map-areas' className={cn('contents', className)}>
      {tip && (
        <div
          ref={tipElement}
          data-slot='map-areas-tip'
          aria-hidden
          className='pointer-events-none absolute top-0 left-0 z-10 grid gap-0.5 rounded-lg emphasis-floating px-2 py-1.5 text-xs whitespace-nowrap tabular-nums'
        >
          <p className='font-medium text-strong'>{tip.label ?? tip.id}</p>
          <p className='text-subtle'>
            {label}: {formatValue(tip.value)},{' '}
            {shareOf(tip.value, values.total)} of all
          </p>
        </div>
      )}
      {legend && values.all.length > 0 && (
        <AreasLegend
          label={label}
          ranges={rangesOf(values.starts, values.all, formatValue)}
          least={formatValue(values.starts[0] ?? 0)}
          most={formatValue(values.largest)}
        />
      )}
    </div>
  )
}

MapAreas.displayName = 'MapAreas'

// The key: each colour's range, strongest first. A colour whose range is
// empty, as when many areas share one value, is left out.
function AreasLegend({
  label,
  ranges,
  least,
  most
}: {
  label: string
  ranges: { level: number; range: string }[]
  least: string
  most: string
}) {
  return (
    <div
      data-slot='map-cluster-legend'
      aria-hidden
      className='pointer-events-none absolute z-10 grid gap-1 rounded-lg is-translucent bg-raised px-2 py-1.5 text-xs text-subtle tabular-nums'
    >
      <p className='font-medium text-normal'>{label}</p>
      {/* On a small map, a row of the colours from the least to the most. */}
      <div className='hidden gap-1 @max-md:grid'>
        <div className='flex'>
          {ranges.toReversed().map(({ level }) => (
            <span
              key={level}
              data-slot='map-cluster-legend-swatch'
              data-level={level}
              className='h-2 w-5 first:rounded-s-full last:rounded-e-full'
            />
          ))}
        </div>
        <div className='flex justify-between gap-2'>
          <span>{least}</span>
          <span>{most}</span>
        </div>
      </div>
      <ul className='grid gap-0.5 @max-md:hidden'>
        {ranges.map(({ level, range }) => (
          <li key={level} className='flex items-center gap-1.5'>
            <span
              data-slot='map-cluster-legend-swatch'
              data-level={level}
              className='h-2.5 w-4 rounded-sm'
            />
            {range}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * The values to draw: the array last drawn while a new one holds the same
 * values, as when an app builds `data` while rendering. Without it, every
 * render of that app would send every area to the engine again.
 */
function useSameValues(data: readonly MapAreaValue[]) {
  const [kept, setKept] = useState(data)
  if (kept === data || sameValues(kept, data)) return kept
  setKept(data)
  return data
}

function sameValues(a: readonly MapAreaValue[], b: readonly MapAreaValue[]) {
  return (
    a.length === b.length &&
    a.every((area, i) => {
      const other = b[i]!
      return (
        area.id === other.id &&
        area.value === other.value &&
        area.label === other.label
      )
    })
  )
}

const sameAreas = (a: readonly MapAreaInView[], b: readonly MapAreaInView[]) =>
  sameValues(a, b) && a.every((area, i) => area.share === b[i]!.share)

function withBox(feature: MapAreaFeature): [string, Shape] {
  return [feature.id, { ...feature, box: areaBox(feature.geometry) }]
}

function levelColours(element: HTMLElement) {
  return LEVELS.map((level) => {
    const probe = document.createElement('span')
    probe.hidden = true
    probe.dataset.slot = 'map-cluster-legend-swatch'
    probe.dataset.level = String(level)
    element.append(probe)
    const colours = {
      rest: readColor(probe, '--map-cluster-rest'),
      hover: readColor(probe, '--map-cluster-hover')
    }
    probe.remove()
    return colours
  })
}

/** The area with a value at a place, checked against its box first. */
function areaAt(
  { lat, lng: counted }: LatLng,
  values: ReadonlyMap<string, MapAreaValue>,
  shapes: ReadonlyMap<string, Shape>
): string | undefined {
  const lng = wrapLng(counted)
  for (const id of values.keys()) {
    const shape = shapes.get(id)!
    const [west, south, east, north] = shape.box
    if (lng < west || lng > east || lat < south || lat > north) continue
    if (areaContains(shape.geometry, { lat, lng })) return id
  }
  return undefined
}

function viewBounds(
  instance: MapEngineInstance,
  element: HTMLElement
): MapBounds {
  const { width, height } = element.getBoundingClientRect()
  // All four corners, as a turned map's north isn't along its top edge.
  const corners = [
    instance.unproject({ x: 0, y: 0 }),
    instance.unproject({ x: width, y: 0 }),
    instance.unproject({ x: 0, y: height }),
    instance.unproject({ x: width, y: height })
  ]
  const lats = corners.map(({ lat }) => lat)
  const lngs = corners.map(({ lng }) => lng)
  return {
    southWest: { lat: Math.min(...lats), lng: Math.min(...lngs) },
    northEast: { lat: Math.max(...lats), lng: Math.max(...lngs) }
  }
}

function overlaps(box: Shape['box'], { southWest, northEast }: MapBounds) {
  if (box[1] > northEast.lat || box[3] < southWest.lat) return false
  // A view panned across the date line counts on past 180, so the area is
  // tried there too.
  const west = wrapLng(southWest.lng)
  const east = west + (northEast.lng - southWest.lng)
  return [0, 360].some((turn) => box[0] + turn <= east && box[2] + turn >= west)
}

function shareOf(value: number, total: number) {
  const percent = (value / total) * 100
  if (percent > 0 && percent < 0.5) return '<1%'
  return `${Math.round(percent)}%`
}
