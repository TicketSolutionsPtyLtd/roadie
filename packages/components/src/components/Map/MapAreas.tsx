'use client'

import {
  useEffect,
  useEffectEvent,
  useId,
  useMemo,
  useRef,
  useState
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { useMapContext } from './MapContext'
import type { LatLng, MapAreaLayer, MapBounds, MapPixel } from './engine'
import { type AreaBox, areaBox, areaContains } from './geometry'
import { readColor } from './palette'
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
   * The property that holds a GeoJSON feature's id, when it isn't the
   * feature's own `id`, such as `POA_CODE21`.
   */
  idProperty?: string
  /**
   * The areas' values. Areas with none, or with nothing, aren't drawn, so
   * the map shows through. Send totals per area, never a row per person.
   * The same values in a new array draw nothing again.
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

// Five steps, each holding a fifth of the areas with values. Totals per
// area are skewed, so even steps would leave most areas in the first.
const LEVELS = [0, 1, 2, 3, 4] as const
const FILL = 0.62
const FILL_ACTIVE = 0.88
const LINE = 0.5
const LINE_ACTIVE = 2.5

const formatNumber = (value: number) => value.toLocaleString()

type Shape = MapAreaFeature & { box: AreaBox }

/**
 * Areas, such as postcodes, filled in heat colours by their values. An
 * alternative to `Map.Clusters` when values belong to areas rather than
 * points: each area shows where its value comes from, at every zoom.
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
  const { instance, frame, setArea } = useMapContext('Map.Areas')
  const data = useSameValues(given)

  const shapes = useMemo(
    () => new Map(areaFeatures(areas, { idProperty }).map(withBox)),
    [areas, idProperty]
  )
  const values = useMemo(() => {
    const drawn = data.filter(({ id, value }) => value > 0 && shapes.has(id))
    const total = drawn.reduce((sum, { value }) => sum + value, 0)
    const all = drawn.map((d) => d.value)
    return {
      drawn,
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
  // By id, so a pointer moving inside one area lights it once.
  const hoveredId = hovered?.id
  const lit = useMemo(() => {
    const ids = new Set(
      typeof highlight === 'string' ? [highlight] : (highlight ?? [])
    )
    if (hoveredId) ids.add(hoveredId)
    return [...ids].filter((id) => shapes.has(id))
  }, [highlight, hoveredId, shapes])
  const showsActive = instance?.setActiveAreas !== undefined

  // Every area with a value, as one set, so the engine draws them together.
  // An engine that can't restyle one area gets them all again with the
  // active ones changed.
  // A key, so lighting an area through the engine never redraws the rest.
  const redrawnLit = showsActive ? '' : lit.join('\n')
  const layers = useMemo((): MapAreaLayer[] => {
    if (colours.length === 0) return []
    const active = new Set(redrawnLit.split('\n'))
    return values.drawn.map(({ id, value }) => {
      const { rest, hover } = colours[levelOf(value, values.starts)]!
      const on = active.has(id)
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
  }, [colours, values, shapes, uid, redrawnLit])
  useEffect(() => {
    setArea(uid, layers)
  }, [uid, layers, setArea])
  useEffect(() => () => setArea(uid, null), [uid, setArea])
  useEffect(() => {
    instance?.setActiveAreas?.(lit.map((id) => `${uid}${id}`))
  }, [instance, lit, uid, layers])

  // The area under the pointer, checked against its box first.
  const valueOf = useMemo(
    () => new Map(values.drawn.map((d) => [d.id, d])),
    [values]
  )
  useEffect(() => {
    const element = frame.current
    if (!instance || !element) return
    let frameRequest = 0
    const track = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      cancelAnimationFrame(frameRequest)
      frameRequest = requestAnimationFrame(() => {
        const box = element.getBoundingClientRect()
        const at = { x: event.clientX - box.left, y: event.clientY - box.top }
        const id = areaAt(instance.unproject(at), valueOf, shapes)
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
  }, [instance, frame, valueOf, shapes])
  // A moving map takes the area away from under the label.
  useEffect(() => instance?.on('move', () => setHovered(null)), [instance])

  // The areas in view, as the map settles. Only a changed list is reported:
  // an app that keeps it in state renders again, and would otherwise be told
  // the same list each time it did.
  const reported = useRef<MapAreaInView[] | undefined>(undefined)
  const report = useEffectEvent(() => {
    const element = frame.current
    if (!onAreasChange || !instance || !element) return
    const view = viewBounds(instance.unproject, element)
    const inView = values.drawn
      .filter(({ id }) => overlaps(shapes.get(id)!.box, view))
      .map(({ id, value, label: name }) => ({
        id,
        label: name ?? id,
        value,
        share: values.total > 0 ? value / values.total : 0
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

  const tip = hovered && valueOf.get(hovered.id)
  return (
    <div data-slot='map-areas' className={cn('contents', className)}>
      {tip && (
        <div
          data-slot='map-areas-tip'
          aria-hidden
          className='pointer-events-none absolute top-0 left-0 z-10 grid gap-0.5 rounded-lg emphasis-floating px-2 py-1.5 text-xs whitespace-nowrap tabular-nums'
          style={{
            transform: `translate(${hovered.at.x + 12}px, ${hovered.at.y + 12}px)`
          }}
        >
          <p className='font-medium text-strong'>{tip.label ?? tip.id}</p>
          <p className='text-subtle'>
            {label}: {formatValue(tip.value)},{' '}
            {shareOf(tip.value, values.total)} of all
          </p>
        </div>
      )}
      {legend && values.drawn.length > 0 && (
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

MapAreas.displayName = 'Map.Areas'

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

/**
 * Where each step after the first starts: the values a fifth, two fifths,
 * three and four fifths of the way through the areas, smallest first.
 */
export function classStarts(values: readonly number[]): number[] {
  if (values.length === 0) return []
  const sorted = values.toSorted((a, b) => a - b)
  return LEVELS.map(
    (level) => sorted[Math.floor((level / LEVELS.length) * sorted.length)]!
  )
}

/**
 * Each step's range, from where it starts to the largest value in it, so no
 * two ranges share a value. A step with no values is left out.
 */
export function rangesOf(
  starts: readonly number[],
  values: readonly number[],
  format: (value: number) => string
): { level: number; range: string }[] {
  const ends = starts.map(() => -Infinity)
  for (const value of values) {
    const level = levelOf(value, starts)
    ends[level] = Math.max(ends[level]!, value)
  }
  return starts
    .map((start, level) => ({ level, start, end: ends[level]! }))
    .filter(({ end }) => end !== -Infinity)
    .map(({ level, start, end }) => ({
      level,
      range: end === start ? format(start) : `${format(start)}–${format(end)}`
    }))
    .toReversed()
}

/** The step a value falls in, from 0 to 4. */
export function levelOf(value: number, starts: readonly number[]): number {
  let level = 0
  for (let i = 1; i < starts.length; i++) if (value >= starts[i]!) level = i
  return level
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

function areaAt(
  place: LatLng,
  values: ReadonlyMap<string, MapAreaValue>,
  shapes: ReadonlyMap<string, Shape>
): string | undefined {
  const { lat, lng } = place
  for (const id of values.keys()) {
    const shape = shapes.get(id)!
    const [west, south, east, north] = shape.box
    if (lng < west || lng > east || lat < south || lat > north) continue
    if (areaContains(shape.geometry, place)) return id
  }
  return undefined
}

function viewBounds(
  unproject: (pixel: MapPixel) => LatLng,
  element: HTMLElement
): MapBounds {
  const { width, height } = element.getBoundingClientRect()
  // All four corners, as a turned map's north isn't along its top edge.
  const corners = [
    unproject({ x: 0, y: 0 }),
    unproject({ x: width, y: 0 }),
    unproject({ x: 0, y: height }),
    unproject({ x: width, y: height })
  ]
  const lats = corners.map(({ lat }) => lat)
  const lngs = corners.map(({ lng }) => lng)
  return {
    southWest: { lat: Math.min(...lats), lng: Math.min(...lngs) },
    northEast: { lat: Math.max(...lats), lng: Math.max(...lngs) }
  }
}

function overlaps(box: Shape['box'], { southWest, northEast }: MapBounds) {
  return (
    box[0] <= northEast.lng &&
    box[2] >= southWest.lng &&
    box[1] <= northEast.lat &&
    box[3] >= southWest.lat
  )
}

function shareOf(value: number, total: number) {
  if (total <= 0) return '0%'
  const percent = (value / total) * 100
  if (percent > 0 && percent < 0.5) return '<1%'
  return `${Math.round(percent)}%`
}
