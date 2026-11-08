'use client'

import {
  type CSSProperties,
  type ComponentProps,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { MapTrifoldIcon } from '@phosphor-icons/react'
import { createPortal } from 'react-dom'

import { cn } from '@oztix/roadie-core/utils'

import { useAccentScopeProps } from '../../providers/AccentScopeContext'
import { mergeRefs } from '../../utils/mergeRefs'
import { EmptyState } from '../EmptyState'
import { MapContext, type MapContextValue } from './MapContext'
import { MapCredits } from './MapCredits'
import { MapEngineContext } from './MapEngineContext'
import { MapExpandButton } from './MapToolbar'
import type {
  LatLng,
  MapAreaLayer,
  MapEngine,
  MapEngineInstance,
  MapMountOptions,
  MapView
} from './engine'
import { maplibreEngine } from './maplibreEngine'
import { type MapTone, readPalette } from './palette'

const builtInEngine: MapEngine = maplibreEngine()

type MapStatus = 'loading' | 'ready' | 'error'

const CREDITS_SHOWN_FOR = 5_000

export type MapRootProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** Where the map starts. Read once, on first render. */
  defaultCenter: LatLng
  /**
   * How far in the map starts: 0 shows the world; 13 shows a suburb. Read
   * once, on first render.
   * @default 13
   */
  defaultZoom?: number
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
  defaultZoom = 13,
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
  const [initialView] = useState<MapView>(() => ({
    center: defaultCenter,
    zoom: defaultZoom
  }))
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
  const [areas, setAreas] = useState<Record<string, MapAreaLayer>>({})
  const setArea = useCallback((id: string, area: MapAreaLayer | null) => {
    setAreas(({ [id]: _old, ...others }) =>
      area ? { ...others, [id]: area } : others
    )
  }, [])
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
    instance?.setAreas(Object.values(areas))
  }, [instance, areas])

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
        const stopMoves = instance.on('move', collapseCredits)
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
                  {children}
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
