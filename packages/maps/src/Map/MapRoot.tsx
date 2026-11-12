'use client'

import {
  type CSSProperties,
  type ComponentProps,
  type ReactNode,
  type RefObject,
  use,
  useCallback,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { MapTrifoldIcon } from '@phosphor-icons/react'
import { createPortal } from 'react-dom'

import { useAccentScopeProps } from '@oztix/roadie-components/cascade'
import { EmptyState } from '@oztix/roadie-components/empty-state'
import { FieldContext, useFieldContext } from '@oztix/roadie-components/field'
import { cn } from '@oztix/roadie-core/utils'

import { mergeRefs } from '../mergeRefs'
import { MapContext, type MapContextValue } from './MapContext'
import { MapCredits } from './MapCredits'
import { MapEngineContext } from './MapEngineContext'
import { MapExpandButton } from './MapToolbar'
import type {
  LatLng,
  MapAreaLayer,
  MapBounds,
  MapEngine,
  MapEngineInstance,
  MapMountOptions,
  MapView
} from './engine'
import { maplibreEngine } from './maplibreEngine'
import { type MapTone, readPalette } from './palette'
import { PLACE_ZOOM } from './place'

const builtInEngine: MapEngine = maplibreEngine()

type MapStatus = 'loading' | 'ready' | 'error'

const CREDITS_SHOWN_FOR = 5_000

// With no centre given, the map shows the whole world.
const WORLD: MapView = { center: { lat: 0, lng: 0 }, zoom: 1 }
// Fitting leaves room for the pins' heads and the toolbar.
const FIT_PADDING = 48

/** What an app can ask of a map, through `actionsRef`. */
export type MapActions = {
  /** Eases the map to this view, or jumps for reduced motion. */
  flyTo: (view: Partial<MapView>) => void
  /**
   * Fits the map to these places or, with none given, to every pin and area
   * on it, no closer than street level.
   */
  fitTo: (places?: readonly LatLng[]) => void
}

export type MapRootProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** Where the map starts, when uncontrolled. Read once, on first render. */
  defaultCenter?: LatLng
  /**
   * How far in the map starts, when uncontrolled: 0 shows the world; 13
   * shows a suburb. Read once, on first render. With no centre given, the
   * map starts on the whole world, at 1.
   * @default 13
   */
  defaultZoom?: number
  /**
   * Whether the map opens on every pin and area on it, as Show all does,
   * once they're there. Until then it shows `defaultCenter` and
   * `defaultZoom`. It fits once, and not at all once the reader has used
   * the map or the app has moved it. Read once, on first render. A
   * controlled `center` or `zoom` takes its place.
   * @default false
   */
  defaultFit?: boolean
  /**
   * Where the map is centred, when controlled. When it changes, the map
   * moves there. The reader can still pan; `onViewChange` says where to.
   */
  center?: LatLng
  /** How far in the map is, when controlled, as `center` works. */
  zoom?: number
  /**
   * Called with the centre and zoom once the map settles after the reader
   * or the app moves it.
   */
  onViewChange?: (view: MapView) => void
  /**
   * Takes `flyTo` and `fitTo`, for moving the map from elsewhere. They do
   * nothing until the map has loaded; set `center` and `zoom` for where it
   * starts.
   */
  actionsRef?: RefObject<MapActions | null>
  /**
   * Names the map for screen readers. Say what it shows, such as
   * "Where Kazoo Hollow Room is".
   * @default 'Map'
   */
  'aria-label'?: string
  /**
   * Whether the map fills the window, when controlled. It fills the window,
   * not the screen: the browser's own bars stay. While it does, the map
   * shows Exit full screen, in `Map.Toolbar` or on its own.
   */
  expanded?: boolean
  /**
   * Whether the map starts filling the window, when uncontrolled.
   * @default false
   */
  defaultExpanded?: boolean
  /**
   * Called when the full screen button, Exit full screen or Escape asks the
   * map to fill the window or go back. Controlled, nothing moves until
   * `expanded` changes.
   */
  onExpandedChange?: (expanded: boolean) => void
  /**
   * How the basemap is coloured. `intent` draws it in the intent around the
   * map, to sit quietly in the page. `natural` draws green parks, blue water
   * and yellow main roads, as people know maps, whatever the intent. Both
   * follow light and dark mode.
   * @default 'intent'
   */
  tone?: MapTone
  children?: ReactNode
}

/**
 * A map of places. It loads its engine when it first mounts, and sizes to
 * a 16:9 frame unless `className` sets another.
 */
export function MapRoot({
  defaultCenter,
  defaultZoom,
  defaultFit = false,
  center,
  zoom,
  onViewChange,
  actionsRef,
  'aria-label': label = 'Map',
  expanded: expandedProp,
  defaultExpanded = false,
  onExpandedChange,
  tone = 'intent',
  className,
  children,
  ref,
  ...props
}: MapRootProps) {
  const engine = use(MapEngineContext) ?? builtInEngine
  // The field around the map is the picker's alone; its other parts see none.
  const field = useFieldContext()
  const [formSlot, setFormSlot] = useState<HTMLDivElement | null>(null)
  const surface = useRef<HTMLDivElement>(null)
  // The frame is the placeholder in the page. It keeps its size while the
  // map fills the window, so the page never shifts.
  const frame = useRef<HTMLDivElement>(null)
  // The layer reads the intent and theme around the frame as it opens.
  const [frameElement, setFrameElement] = useState<HTMLDivElement | null>(null)
  const frameRef = useMemo(() => mergeRefs(frame, ref, setFrameElement), [ref])
  // The viewport holds the engine and every part. It sits in the frame
  // inline, and moves into a layer over the page to fill the window, so
  // nothing remounts. It's made on the client, after mount.
  const viewport = useRef<HTMLDivElement | null>(null)
  const [host, setHost] = useState<HTMLDivElement | null>(null)
  useLayoutEffect(() => {
    viewport.current ??= createViewport()
    setHost(viewport.current)
  }, [])
  const [initialView] = useState<MapView>(() => {
    const start = center ?? defaultCenter
    return start
      ? { center: start, zoom: zoom ?? defaultZoom ?? 13 }
      : { ...WORLD, zoom: zoom ?? defaultZoom ?? WORLD.zoom }
  })
  // Read when the engine mounts, so a new label doesn't redraw the map.
  const mountOptions = useEffectEvent(
    (frame: HTMLElement): MapMountOptions => ({
      ...initialView,
      label,
      palette: readPalette(frame, tone)
    })
  )
  const [status, setStatus] = useState<MapStatus>('loading')
  const [creditsCollapsed, setCreditsCollapsed] = useState(false)
  const [instance, setInstance] = useState<MapEngineInstance | null>(null)
  const [areaSets, setAreaSets] = useState<
    Record<string, MapAreaLayer | readonly MapAreaLayer[]>
  >({})
  const setArea = useCallback(
    (id: string, area: MapAreaLayer | readonly MapAreaLayer[] | null) => {
      setAreaSets(({ [id]: _old, ...others }) =>
        area ? { ...others, [id]: area } : others
      )
    },
    []
  )
  const areas = useMemo(() => Object.values(areaSets).flat(), [areaSets])
  const [activeSets, setActiveSets] = useState<
    Record<string, readonly string[]>
  >({})
  const setActiveAreas = useCallback(
    (id: string, active: readonly string[] | null) => {
      setActiveSets(({ [id]: _old, ...others }) =>
        active ? { ...others, [id]: active } : others
      )
    },
    []
  )
  const activeAreas = useMemo(
    () => Object.values(activeSets).flat(),
    [activeSets]
  )
  const [places, setPlaces] = useState<Record<string, LatLng>>({})
  const setPlace = useCallback((id: string, place: LatLng | null) => {
    setPlaces(({ [id]: _old, ...others }) =>
      place ? { ...others, [id]: place } : others
    )
  }, [])
  const content = useMemo(
    () => [
      ...Object.values(places),
      ...areas.flatMap(({ geometry }) => areaCorners(geometry))
    ],
    [places, areas]
  )
  // `defaultFit` opens the map on its content, once. Content that's there as
  // the engine becomes ready is fitted at once, in a layout effect, so no
  // frame paints the pins where the starting view would put them. Content
  // that arrives later is eased to, unless the reader has used the map or
  // the app has moved it by then.
  const [fitsFirst] = useState(
    () => defaultFit && center === undefined && zoom === undefined
  )
  // Null once the fit is made or given up. `late` once the engine has been
  // ready with nothing to fit.
  const opening = useRef<{ late: boolean } | null>(
    fitsFirst ? { late: false } : null
  )
  const stopOpening = useCallback(() => {
    opening.current = null
  }, [])
  const fitTo = useCallback(
    (given?: readonly LatLng[]) => {
      const bounds = boundsOf(given ?? content)
      if (!instance || !bounds) return
      stopOpening()
      instance.fitBounds(bounds, {
        animate: true,
        padding: FIT_PADDING,
        maxZoom: PLACE_ZOOM
      })
    },
    [instance, content, stopOpening]
  )
  useImperativeHandle(
    actionsRef,
    () => ({
      flyTo: (view) => {
        if (!instance) return
        stopOpening()
        instance.setView(view, { animate: true })
      },
      fitTo
    }),
    [instance, fitTo, stopOpening]
  )

  // A layout effect ahead of the opening fit below, as a jump settles while
  // it's made, before a later effect could listen for it.
  const viewChanged = useEffectEvent((view: MapView) => onViewChange?.(view))
  useLayoutEffect(() => {
    if (!instance) return
    return instance.on('moveend', () => viewChanged(instance.getView()))
  }, [instance])

  // A press, a key or a scroll on the map is the reader using it: a pin
  // they drop is theirs to place, not content to fit. Tab only passes
  // through. Nothing is use until there's a map. A resize isn't use, so the
  // map's view isn't what's compared.
  useEffect(() => {
    if (!host || !instance || !fitsFirst) return
    const used = (event: Event) => {
      if (!(event instanceof KeyboardEvent && event.key === 'Tab'))
        stopOpening()
    }
    const events = ['pointerdown', 'keydown', 'wheel'] as const
    for (const event of events)
      host.addEventListener(event, used, { capture: true, passive: true })
    return () => {
      for (const event of events)
        host.removeEventListener(event, used, { capture: true })
    }
  }, [host, instance, fitsFirst, stopOpening])
  // A map with no size, as in a tab that isn't showing, waits to be shown:
  // there's nothing to fit its content into.
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    if (!frameElement || !fitsFirst) return
    const sizes = new ResizeObserver(([entry]) => {
      const { width, height } = entry!.contentRect
      setHidden(width === 0 || height === 0)
    })
    sizes.observe(frameElement)
    return () => sizes.disconnect()
  }, [frameElement, fitsFirst])
  // An engine mounted again starts from the first view again, so it opens
  // on the content again too.
  useEffect(() => {
    if (!instance || !fitsFirst) return
    return () => {
      opening.current = { late: false }
    }
  }, [instance, fitsFirst])
  // True while the map jumps to where it opens, which isn't the map being
  // used, so the credits stay open.
  const jumping = useRef(false)
  // Parts read where they sit as they render, which is before the jump. An
  // update from a layout effect renders them again before the browser
  // paints, so no frame shows them where the starting view put them.
  const [, setJumped] = useState(false)
  useLayoutEffect(() => {
    const waiting = opening.current
    if (!waiting || !instance || hidden) return
    const bounds = boundsOf(content)
    if (!bounds) {
      waiting.late = true
      return
    }
    opening.current = null
    const { late } = waiting
    jumping.current = !late
    instance.fitBounds(bounds, {
      animate: late,
      padding: FIT_PADDING,
      maxZoom: PLACE_ZOOM
    })
    jumping.current = false
    if (!late) setJumped(true)
  }, [instance, content, hidden])
  // The warning is made once, as StrictMode runs the effect twice.
  const controlled = center !== undefined || zoom !== undefined
  const warned = useRef(false)
  useEffect(() => {
    if (!defaultFit || fitsFirst || !controlled || warned.current) return
    if (
      typeof process !== 'undefined' &&
      process?.env?.NODE_ENV !== 'production'
    ) {
      warned.current = true
      console.warn(
        '[Roadie] Map ignores defaultFit with center or zoom set. Use defaultCenter and defaultZoom with it, or call fitTo.'
      )
    }
  }, [defaultFit, fitsFirst, controlled])

  // A controlled centre or zoom moves the map when it changes, unless it's
  // where the map already is, as when it comes back from onViewChange.
  const centerLat = center?.lat
  const centerLng = center?.lng
  useEffect(() => {
    if (!instance) return
    const now = instance.getView()
    const next: Partial<MapView> = {}
    if (
      centerLat !== undefined &&
      centerLng !== undefined &&
      (Math.abs(centerLat - now.center.lat) > SAME_PLACE ||
        Math.abs(centerLng - now.center.lng) > SAME_PLACE)
    )
      next.center = { lat: centerLat, lng: centerLng }
    if (zoom !== undefined && Math.abs(zoom - now.zoom) > SAME_ZOOM)
      next.zoom = zoom
    if (next.center === undefined && next.zoom === undefined) return
    stopOpening()
    // A changed centre keeps the controlled zoom with it, and the other way.
    instance.setView(
      {
        ...(centerLat !== undefined &&
          centerLng !== undefined && {
            center: { lat: centerLat, lng: centerLng }
          }),
        ...(zoom !== undefined && { zoom })
      },
      { animate: true }
    )
  }, [instance, centerLat, centerLng, zoom, stopOpening])

  const [uncontrolledExpanded, setUncontrolledExpanded] =
    useState(defaultExpanded)
  const expandedAsked = expandedProp ?? uncontrolledExpanded
  const setExpanded = useCallback(
    (next: boolean) => {
      if (expandedProp === undefined) setUncontrolledExpanded(next)
      onExpandedChange?.(next)
    },
    [expandedProp, onExpandedChange]
  )
  // A map that failed shows why in the frame, so it never fills the window.
  const expanded = expandedAsked && host !== null && status !== 'error'
  const [layer, setLayer] = useState<HTMLDivElement | null>(null)
  // Whether the viewport has been in the page, in the frame or the layer,
  // which the engine waits for. It stays true as the viewport moves.
  const [placed, setPlaced] = useState(false)
  const placeLayer = useCallback((element: HTMLDivElement | null) => {
    setLayer(element)
    if (element) setPlaced(true)
  }, [])
  // Toolbars in the map, so a map filling the window without one still
  // shows a way back.
  const [toolbars, setToolbars] = useState(0)
  const addToolbar = useCallback(() => {
    setToolbars((count) => count + 1)
    return () => setToolbars((count) => count - 1)
  }, [])
  // The press that closed a list over the map, whose click is skipped. The
  // next press on the map forgets it, so a press that panned can't hold it.
  const closingPress = useRef<Event | null>(null)
  const ignoreClickFrom = useCallback((press: Event) => {
    closingPress.current = press
  }, [])
  useEffect(() => {
    if (!host) return
    const forget = (event: Event) => {
      if (event !== closingPress.current) closingPress.current = null
    }
    host.addEventListener('pointerdown', forget, true)
    return () => host.removeEventListener('pointerdown', forget, true)
  }, [host])
  const onMapClick = useCallback(
    (listener: (place: LatLng) => void) =>
      instance
        ? instance.on('click', (place) => {
            if (!closingPress.current) listener(place)
          })
        : () => {},
    [instance]
  )
  const context = useMemo<MapContextValue>(
    () => ({
      instance,
      frame: viewport,
      setArea,
      setActiveAreas,
      setPlace,
      fitTo,
      canFit: content.length > 0,
      field,
      formSlot,
      expanded,
      setExpanded,
      portalContainer: expanded ? layer : null,
      addToolbar,
      onMapClick,
      ignoreClickFrom
    }),
    [
      instance,
      setArea,
      setActiveAreas,
      setPlace,
      fitTo,
      content.length,
      field,
      formSlot,
      expanded,
      setExpanded,
      layer,
      addToolbar,
      onMapClick,
      ignoreClickFrom
    ]
  )

  // Inline, the viewport sits in the frame. Coming back from the layer, focus
  // in the map stays where it was, as Chromium and WebKit blur an element
  // that moves.
  useLayoutEffect(() => {
    const placeholder = frame.current
    if (!host || !placeholder || expanded || host.parentNode === placeholder)
      return
    const active = document.activeElement
    const focusInside = host.contains(active)
    host.toggleAttribute('data-expanded', false)
    placeholder.append(host)
    setPlaced(true)
    if (focusInside) (active as HTMLElement).focus({ preventScroll: true })
  }, [host, expanded])

  // Filling the window, one finger pans and a plain scroll zooms. Declared
  // before the engine mounts, so it's undone before the engine goes.
  useEffect(() => {
    if (!instance || !expanded) return
    instance.setCooperativeGestures?.(false)
    return () => instance.setCooperativeGestures?.(true)
  }, [instance, expanded])

  // The basemap takes its colours from its tone and the mode around the map,
  // so it follows dark mode and, in `intent`, an intent class here or on an
  // ancestor.
  useEffect(() => {
    const element = frame.current
    if (!instance || !element) return
    let last = ''
    const repaint = () => {
      const palette = readPalette(element, tone)
      const key = JSON.stringify(palette)
      if (key === last) return
      last = key
      instance.setPalette(palette)
    }
    repaint()
    const watcher = new MutationObserver(repaint)
    watcher.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme']
    })
    return () => watcher.disconnect()
  }, [instance, className, tone])

  useEffect(() => {
    instance?.setAreas(areas)
  }, [instance, areas])
  useEffect(() => {
    instance?.setActiveAreas?.(activeAreas)
  }, [instance, activeAreas])

  useEffect(() => {
    const container = surface.current
    // The engine mounts once the viewport is in the page.
    if (!container || !frame.current || !placed) return
    const loading = new AbortController()
    let cancelled = false
    let destroy: (() => void) | undefined
    engine.mount(container, mountOptions(frame.current), loading.signal).then(
      (instance) => {
        // An engine that ignores the signal may still finish after unmount.
        if (cancelled) {
          instance.destroy()
          return
        }
        // OpenStreetMap's guidelines let credits fold once the map is used,
        // or after five seconds.
        const collapseCredits = () => setCreditsCollapsed(true)
        const stopMoves = instance.on('move', () => {
          if (!jumping.current) collapseCredits()
        })
        const timer = setTimeout(collapseCredits, CREDITS_SHOWN_FOR)
        destroy = () => {
          clearTimeout(timer)
          stopMoves()
          setInstance(null)
          instance.destroy()
        }
        setInstance(instance)
        setStatus('ready')
      },
      () => {
        if (!cancelled) setStatus('error')
      }
    )
    return () => {
      cancelled = true
      loading.abort()
      destroy?.()
    }
    // The viewport is set once, and moving it later keeps the engine.
  }, [engine, initialView, placed])

  return (
    // Filling the window is a modal dialog, so Base UI traps focus, hides the
    // page from screen readers, locks its scroll, and closes the top layer
    // first on Escape: a preview or dialog over the map, then the map, then
    // a drawer or dialog the map is in.
    <DialogPrimitive.Root
      open={expanded}
      onOpenChange={(open) => setExpanded(open)}
      // The map covers the window, so nothing outside it can be pressed.
      disablePointerDismissal
    >
      <div
        ref={frameRef}
        role='region'
        aria-label={label}
        aria-busy={status === 'loading' || undefined}
        data-slot='map'
        data-status={status}
        className={cn(
          '@container relative isolate aspect-video w-full overflow-hidden rounded-xl bg-sunken',
          className
        )}
        {...props}
      >
        {/* Form inputs stay here, in the page's form, while the viewport
            moves out to fill the window. */}
        <div ref={setFormSlot} data-slot='map-form' className='contents' />
        {status === 'error' && (
          <EmptyState size='sm' className='absolute inset-0 content-center'>
            <EmptyState.IconTile>
              <MapTrifoldIcon weight='bold' />
            </EmptyState.IconTile>
            <EmptyState.Title>The map couldn’t load</EmptyState.Title>
          </EmptyState>
        )}
        {/* Everything but the error renders into the viewport, through this
            one portal. A part rendered straight into the frame would be left
            behind when the map fills the window. */}
        {host &&
          createPortal(
            <>
              <div
                ref={surface}
                data-slot='map-surface'
                className='absolute inset-0'
                hidden={status === 'error'}
              />
              {status !== 'error' && (
                <MapContext value={context}>
                  <FieldContext value={NO_FIELD}>{children}</FieldContext>
                  {expanded && toolbars === 0 && <MapExit />}
                </MapContext>
              )}
              <MapCredits
                attribution={engine.attribution}
                collapsed={creditsCollapsed}
                onToggle={() => setCreditsCollapsed((collapsed) => !collapsed)}
              />
            </>,
            host
          )}
      </div>
      {host && (
        <DialogPrimitive.Portal>
          <MapLayer
            ref={placeLayer}
            expanded={expanded}
            label={label}
            frame={frameElement}
            viewport={host}
          />
        </DialogPrimitive.Portal>
      )}
    </DialogPrimitive.Root>
  )
}

// What the map's parts see of a Field: none. The picker reads the real one.
const NO_FIELD = { fieldId: '', labelId: '', helperTextId: '', errorTextId: '' }

// Closer than this, a centre or zoom is where the map already is.
const SAME_PLACE = 1e-7
const SAME_ZOOM = 1e-3

// An area's corners, kept per geometry, as a map of postcodes would
// otherwise walk every point each time one changes.
const cornersOf = new WeakMap<MapAreaLayer['geometry'], LatLng[]>()

/**
 * Places along an area's bounds, from its south-west corner to its
 * north-east, no more than a quarter turn apart, so the bounds of them never
 * run round the far side of a wide area.
 */
function areaCorners(geometry: MapAreaLayer['geometry']): LatLng[] {
  const known = cornersOf.get(geometry)
  if (known) return known
  const polygons =
    geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  const bounds = boundsOf(polygons.flat(2).map(([lng, lat]) => ({ lat, lng })))
  const corners: LatLng[] = []
  if (bounds) {
    const { southWest, northEast } = bounds
    const width = northEast.lng - southWest.lng
    const steps = Math.max(1, Math.ceil(width / 90))
    for (let step = 0; step <= steps; step++) {
      const lng = southWest.lng + (width * step) / steps
      corners.push({
        lat: step === 0 ? southWest.lat : northEast.lat,
        // An area across the date line has its east counted on past 180.
        lng: lng > 180 ? lng - 360 : lng
      })
    }
  }
  cornersOf.set(geometry, corners)
  return corners
}

/** The smallest bounds holding every place, or `undefined` for none. */
function boundsOf(places: readonly LatLng[]): MapBounds | undefined {
  if (places.length === 0) return undefined
  const lngs = places.map(({ lng }) => lng).sort((a, b) => a - b)
  // Not spread into `Math.min`, which has a limit on its arguments that a
  // detailed boundary's points pass.
  let south = Infinity
  let north = -Infinity
  for (const { lat } of places) {
    south = Math.min(south, lat)
    north = Math.max(north, lat)
  }
  // The bounds leave out the widest gap between places, which is across the
  // date line unless that's where the places are.
  let west = lngs[0]!
  let east = lngs.at(-1)!
  let gap = 360 - (east - west)
  for (let i = 1; i < lngs.length; i++) {
    if (lngs[i]! - lngs[i - 1]! <= gap) continue
    gap = lngs[i]! - lngs[i - 1]!
    west = lngs[i]!
    east = lngs[i - 1]! + 360
  }
  return {
    southWest: { lat: south, lng: west },
    northEast: { lat: north, lng: east }
  }
}

function createViewport() {
  const viewport = document.createElement('div')
  viewport.dataset.slot = 'map-viewport'
  viewport.className = '@container absolute inset-0 overflow-hidden'
  return viewport
}

/** The class that sets an intent, on the frame or the nearest ancestor. */
function intentAround(frame: HTMLElement) {
  for (
    let element = frame.closest<HTMLElement>('[class*="intent-"]');
    element;
    element =
      element.parentElement?.closest<HTMLElement>('[class*="intent-"]') ?? null
  ) {
    const intent = [...element.classList].find((name) =>
      name.startsWith('intent-')
    )
    if (intent) return intent
  }
  return undefined
}

type Theme = { className?: string; dataTheme?: string }

/** A light or dark scope below the page's root, which the layer leaves. */
function themeAround(frame: HTMLElement): Theme {
  for (
    let element: HTMLElement | null = frame;
    element && element !== document.documentElement;
    element = element.parentElement
  ) {
    const dataTheme = element.getAttribute('data-theme') ?? undefined
    const className = ['dark', 'light'].find((name) =>
      element!.classList.contains(name)
    )
    if (dataTheme || className) return { className, dataTheme }
  }
  return {}
}

type MapLayerProps = {
  ref: (layer: HTMLDivElement | null) => void
  /** Whether the map fills the window now. */
  expanded: boolean
  label: string
  frame: HTMLDivElement | null
  viewport: HTMLDivElement
}

/**
 * The map filling the window: Base UI's dialog popup over the page, which
 * the viewport moves into. Opened last, it sits over any dialog or drawer the
 * map is in, and under overlays opened from it.
 */
function MapLayer({ ref, expanded, label, frame, viewport }: MapLayerProps) {
  const layer = useRef<HTMLDivElement>(null)
  // Where focus was as the map filled the window, and whether that was in
  // the map, such as on its full screen button.
  const opener = useRef<{ element: HTMLElement | null; inside: boolean }>({
    element: null,
    inside: false
  })
  // Portalled under the body, the layer takes the intent and theme from
  // around the frame, as Roadie's popovers and dialogs do.
  const [cascade, setCascade] = useState<{ intent?: string } & Theme>({})
  // Moves the viewport in as the popup mounts, before Base UI places focus.
  // Chromium and WebKit blur an element as it moves, so focus in the map
  // goes back where it was.
  const moveIn = useCallback(
    (element: HTMLDivElement) => {
      if (!frame || viewport.parentNode === element) return
      setCascade({ intent: intentAround(frame), ...themeAround(frame) })
      const active = document.activeElement as HTMLElement | null
      const inside = viewport.contains(active)
      opener.current = { element: active, inside }
      element.append(viewport)
      viewport.toggleAttribute('data-expanded', true)
      if (inside) active!.focus({ preventScroll: true })
    },
    [frame, viewport]
  )
  const attach = useCallback(
    (element: HTMLDivElement | null) => {
      layer.current = element
      if (element) moveIn(element)
      ref(element)
    },
    [ref, moveIn]
  )
  // Opened again before Base UI unmounted the closing popup, the popup is
  // reused and its ref doesn't run, so opening moves the viewport in too.
  useLayoutEffect(() => {
    if (expanded && layer.current) moveIn(layer.current)
  }, [expanded, moveIn])
  // Given no style, the accent scope's style is a plain object.
  const { style: accentStyle, ...accentScope } =
    useAccentScopeProps<never>(undefined)

  return (
    <DialogPrimitive.Popup
      ref={attach}
      aria-modal='true'
      aria-label={label}
      data-slot='map-layer'
      data-expanded=''
      data-theme={cascade.dataTheme}
      // Focus stays on the button that filled the window; from outside the
      // map, it moves to the map itself.
      initialFocus={() =>
        opener.current.inside ? opener.current.element : layer.current
      }
      // Focus still in the map came back with it. From outside, it goes back
      // where it was, unless it has since moved on, such as into a dialog.
      finalFocus={() => {
        const active = document.activeElement as HTMLElement | null
        if (viewport.contains(active)) return active
        const lost =
          !active ||
          active === document.body ||
          layer.current?.contains(active) === true
        const { element } = opener.current
        if (!lost || !element?.isConnected || element === document.body)
          return false
        return element
      }}
      className={cn(
        'fixed inset-0 z-modal overscroll-none bg-sunken outline-none data-closed:hidden',
        cascade.intent,
        cascade.className
      )}
      style={accentStyle as CSSProperties | undefined}
      {...accentScope}
    />
  )
}

MapRoot.displayName = 'Map'

/** A way back for a map filling the window with no toolbar of its own. */
function MapExit() {
  return (
    <div className='absolute top-(--map-inset-top) right-(--map-inset-right) z-10'>
      <MapExpandButton />
    </div>
  )
}
