'use client'

import {
  type ComponentProps,
  type ReactNode,
  Suspense,
  use,
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { usePendingNavigationStore } from '../../providers/PendingNavigationContext'
import { mergeRefs } from '../../utils/mergeRefs'
import { scrollToTop as scrollToTopOf } from '../../utils/reducedMotion'
import type { DrawerSize } from '../Drawer/variants'
import { ScrollArea } from '../ScrollArea'
import { PANE_CHROME_NONE, PaneChromeContext } from './PaneChromeContext'
import { PaneContext } from './PaneContext'
import { PaneFallback } from './PaneFallback'
import { PaneInspectorContext } from './PaneInspectorContext'
import { PaneInspectorDrawer, useColumnYielded } from './PaneInspectorDrawer'
import {
  PaneKindContext,
  PaneStackContext,
  isOverflowKind
} from './PaneStackContext'
import { COLUMN_DEPTH, PANE_DEEP, PANE_MAX_DEPTH } from './paneDepth'
import {
  historyEntryKey,
  recallPaneScroll,
  rememberPaneScroll,
  restorePaneScroll
} from './paneScroll'
import {
  type PaneEmphasis,
  type PaneInspectorSize,
  type PaneMeasure,
  type PaneMeasureAlign,
  paneVariants,
  paneViewportVariants
} from './variants'

// Base UI writes overflow inline, so a class can't clip the x axis.
const CLIP_HORIZONTAL = { overflowX: 'clip' } as const

export type PaneRootProps = ComponentProps<'section'> & {
  /** The column it fills; an `inspector` gives up its column first. @default 'detail' */
  column?: 'list' | 'detail' | 'inspector'
  /** The route has reached this pane; pass `false` only for one mounted early, such as an empty detail column. @default true */
  reached?: boolean
  /** Only for a pane rendered out of document order, such as one streamed into a resumed prerender. */
  depth?: 0 | 1 | 2 | 3
  /** The surface. `subtler` paints none. @default 'raised' */
  emphasis?: PaneEmphasis
  /** An inspector's width: 14rem, 20rem or 24rem. A wider one yields its column sooner. @default 'sm' */
  size?: PaneInspectorSize
  /** Caps the body and title while the header and footer span the column: `narrow` 24rem for forms, `readable` 65ch for text, `wide` 56rem. @default 'full' */
  measure?: PaneMeasure
  /** Where capped content sits in a wider pane. @default 'center' */
  measureAlign?: PaneMeasureAlign
  /** What the phone tab bar does while this pane is top; `auto` collapses it on scroll. @default 'auto' */
  tabBar?: 'visible' | 'auto' | 'hidden'
  /** Holds the pending indicator for a wait Roadie can't see, such as a fetch without Suspense or a mutation. */
  pending?: boolean
  /** The body skeleton while the pane's content is suspended. `Pane.Body` shows it too. */
  loading?: ReactNode
  /** The drawer an inspector's content moves into once its column yields. Fixed tall, so filtering the content can't resize it. @default 'lg' */
  drawerSize?: DrawerSize
  /** An inspector's content should be seen: already true while its column shows, and opens its drawer once the column has yielded. */
  reveal?: boolean
  /** An inspector's drawer opened from `Pane.InspectorTrigger`, or was dismissed. */
  onRevealChange?: (reveal: boolean) => void
}

const subscribeNever = () => () => {}
// True on the server and through this pane's own hydration, even if its boundary hydrates late.
const useHydrating = () =>
  useSyncExternalStore(
    subscribeNever,
    () => false,
    () => true
  )

// Hysteresis, so a 1px scroll can't oscillate the title. Exported for tests.
export const COLLAPSE_AT = 64
export const EXPAND_AT = 40

export function PaneRoot({
  className,
  column = 'detail',
  reached = true,
  depth: declaredDepth,
  emphasis = 'raised',
  size = 'sm',
  measure = 'full',
  measureAlign = 'center',
  tabBar = 'auto',
  pending,
  loading,
  drawerSize = 'lg',
  reveal,
  onRevealChange,
  role,
  ref: forwardedRef,
  children,
  ...props
}: PaneRootProps) {
  // Boundary values are memoized below; compiler caches only duplicate them.
  'use no memo'
  const stackFromContext = use(PaneStackContext)
  const surroundingPane = use(PaneContext)
  // A pane inside a pane's content is content, not a stack sibling.
  const stack = surroundingPane === null ? stackFromContext : null
  const kind = use(PaneKindContext)
  const paneId = useId()
  const hydrating = useHydrating()
  const paneRef = useRef<HTMLElement | null>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [bodyTitle, setBodyTitleState] = useState<ReactNode | null>(null)

  // Functional form: a ReactNode can be a function.
  const setBodyTitle = useCallback(
    (node: ReactNode | null) => setBodyTitleState(() => node),
    []
  )

  // ScrollArea hard-codes role=presentation, so the role goes on the render element.
  const section = useMemo(() => <section role={role} />, [role])

  const setPaneRef = useMemo(
    () => mergeRefs<HTMLElement>(paneRef, forwardedRef),
    [forwardedRef]
  )

  // A layout effect, so a client-mounted pane is placed before the column default paints.
  const register = stack?.register
  const unregister = stack?.unregister
  useLayoutEffect(() => {
    const node = paneRef.current
    if (!register || !unregister || !node) return
    register(paneId, node, {
      column,
      reached,
      tabBar,
      kind,
      depth: declaredDepth
    })
    return () => unregister(paneId)
  }, [
    register,
    unregister,
    paneId,
    column,
    reached,
    tabBar,
    kind,
    declaredDepth
  ])

  const place = stack?.placeOf(
    paneId,
    { column, reached, tabBar, kind, depth: declaredDepth },
    hydrating
  )
  // An inspector sits off the stack whatever depth it declares, so it never goes up a level.
  const depth =
    column === 'inspector'
      ? null
      : place
        ? place.depth
        : (declaredDepth ?? COLUMN_DEPTH[column])
  const position = place?.position ?? null
  const chrome = place?.chrome ?? PANE_CHROME_NONE
  const isRoot = place?.isRoot ?? true
  const isOverflow = isOverflowKind(kind)
  // A pane mounting or moving slides; More does not, it's a tab switch.
  const markPushing = isOverflow ? undefined : stack?.markPushing
  useInsertionEffect(() => {
    markPushing?.()
    return () => markPushing?.()
  }, [markPushing, reached, depth])

  const inStack = stack !== null && column !== 'inspector'

  const inspectorHandle = use(PaneInspectorContext)
  const yields = column === 'inspector' && inspectorHandle !== null
  const yielded = useColumnYielded(paneRef, yields)

  const store = usePendingNavigationStore()
  useEffect(() => {
    if (pending !== true || store === null) return
    return store.hold()
  }, [pending, store])

  const { scrollPastAt, onScrollPast, onScrollDown } = chrome
  const reportsNav = tabBar === 'auto' && onScrollPast !== undefined
  const navAt = reportsNav ? scrollPastAt : undefined

  // Survives a page step's re-make, which `useId` wouldn't; null until registered.
  const seat =
    place && !place.registered
      ? null
      : `${stack?.level ?? 0}:${column}:${depth}`

  // Behind the top is the pane picked from or popped back to; it keeps its place.
  const destination = stack?.destination
  const scrollToTop = useCallback(() => scrollToTopOf(viewportRef.current), [])

  const context = useMemo(
    () => ({
      depth,
      collapsed,
      scrollToTop,
      isRoot,
      bodyTitle,
      setBodyTitle,
      loading
    }),
    [depth, collapsed, scrollToTop, isRoot, bodyTitle, setBodyTitle, loading]
  )

  // Sentinels, not scrollTop reads, which forced a recalc on every scroll event.
  const reportPast = useEffectEvent((past: boolean) => onScrollPast?.(past))
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport || typeof IntersectionObserver === 'undefined') return
    const past = new Map<number, boolean>()
    const beyond = (at: number) => past.get(at) ?? false
    // A pane that becomes top reports on its first scroll, as a scroll read did.
    let navSeen = false
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const root = entry.rootBounds
          // A hidden pane's zero rects would read as scrolled past.
          if (root === null || root.height === 0) return
          const at = Number((entry.target as HTMLElement).dataset.scrollAt)
          past.set(
            at,
            !entry.isIntersecting &&
              entry.boundingClientRect.bottom <= root.top + 0.5
          )
        }
        setCollapsed((was) => (was ? beyond(EXPAND_AT) : beyond(COLLAPSE_AT)))
        if (navAt !== undefined && navSeen) reportPast(beyond(navAt))
      },
      { root: viewport }
    )
    for (const sentinel of viewport.querySelectorAll<HTMLElement>(
      '[data-slot="pane-scroll-sentinel"]'
    )) {
      if (sentinel.closest('[data-slot="pane-viewport"]') === viewport) {
        observer.observe(sentinel)
      }
    }
    const onFirstScroll = () => {
      navSeen = true
      if (navAt !== undefined) reportPast(beyond(navAt))
    }
    viewport.addEventListener('scroll', onFirstScroll, {
      passive: true,
      once: true
    })
    return () => {
      observer.disconnect()
      viewport.removeEventListener('scroll', onFirstScroll)
    }
  }, [navAt])

  // One scrollTop read per frame, whoever is asking.
  const reportDown = useEffectEvent(() => onScrollDown?.())
  const wantsDirection = reportsNav && onScrollDown !== undefined
  // Re-made for each arrival, so it closes over the entry it writes for.
  useEffect(() => {
    const viewport = viewportRef.current
    const entry = seat === null ? null : historyEntryKey()
    if (!viewport || (!wantsDirection && entry === null)) return
    let last = viewport.scrollTop
    let frame: number | null = null
    const onScroll = () => {
      if (frame !== null) return
      frame = requestAnimationFrame(() => {
        frame = null
        const top = viewport.scrollTop
        if (wantsDirection && top > last) reportDown()
        last = top
        // Now, not on route change: new content clamps the scroll before any effect runs.
        if (entry !== null && seat !== null)
          rememberPaneScroll(entry, seat, top)
      })
    }
    viewport.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      viewport.removeEventListener('scroll', onScroll)
      if (frame !== null) cancelAnimationFrame(frame)
    }
  }, [wantsDirection, destination, position, seat])

  const shown = useRef({ destination, position })
  const mounted = useRef(false)
  const settling = useRef<() => void>(() => {})
  useLayoutEffect(() => {
    if (seat === null) return
    const last = shown.current
    const entry = historyEntryKey()
    shown.current = { destination, position }
    const viewport = viewportRef.current
    if (!viewport) return
    settling.current()
    const back = entry === null ? undefined : recallPaneScroll(entry, seat)
    const first = !mounted.current
    mounted.current = true
    // Going back is the one arrival that isn't new; checked before guards that read a stale snapshot.
    if (back !== undefined) {
      settling.current = restorePaneScroll(viewport, back)
      return
    }
    // The top is the deepest reached pane; `topNow` reads the committed DOM, `position` lags a commit.
    const isTop =
      stack === null ? reached : reached && stack.topNow() === paneRef.current
    if (
      first ||
      !isTop ||
      last.destination === destination ||
      last.position === 'behind' ||
      position === 'behind'
    ) {
      return
    }
    viewport.scrollTop = 0
  }, [destination, position, seat, reached, stack])

  const pane = (
    <ScrollArea
      render={section}
      data-slot='pane'
      data-column={column}
      data-size={column === 'inspector' ? size : undefined}
      data-measure={measure}
      data-measure-align={measure === 'full' ? undefined : measureAlign}
      data-stack-position={position ?? undefined}
      data-depth={
        depth === null ? undefined : depth > PANE_MAX_DEPTH ? PANE_DEEP : depth
      }
      data-stack={inStack ? '' : undefined}
      data-reached={reached ? '' : undefined}
      data-level={stack?.level}
      data-overflow={isOverflow ? '' : undefined}
      data-tab-bar={tabBar}
      aria-busy={pending || undefined}
      className={cn(paneVariants({ emphasis }), className)}
      {...props}
      ref={setPaneRef}
    >
      <ScrollArea.Viewport
        ref={viewportRef}
        data-slot='pane-viewport'
        className={paneViewportVariants({
          clearsTabBar: tabBar !== 'hidden'
        })}
        style={CLIP_HORIZONTAL}
      >
        {/* fitWidth={false} keeps wide children clipped. */}
        <ScrollArea.Content fitWidth={false} className='px-(--content-inset)'>
          <div
            aria-hidden
            data-slot='pane-scroll-sentinels'
            className='pointer-events-none relative h-0'
          >
            {[EXPAND_AT, COLLAPSE_AT, navAt].map((at) =>
              at === undefined ? null : (
                <div
                  key={at}
                  data-slot='pane-scroll-sentinel'
                  data-scroll-at={at}
                  className='absolute inset-x-0 top-0'
                  style={{ height: at }}
                />
              )
            )}
          </div>
          <PaneChromeContext value={chrome}>
            <PaneContext value={context}>
              {/* Wraps, never reads: a server child still streaming is a lazy
                  element, and reading it suspends the pane itself. */}
              <Suspense fallback={<PaneFallback header />}>
                {yielded ? null : children}
              </Suspense>
            </PaneContext>
          </PaneChromeContext>
        </ScrollArea.Content>
      </ScrollArea.Viewport>
      {/* keepMounted so the margin binds before overflow is measured. */}
      <ScrollArea.Scrollbar
        keepMounted
        className='mt-[calc(var(--pane-header-height,0px)_+_--spacing(1))]'
      >
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
    </ScrollArea>
  )

  if (!yields) return pane
  return (
    <>
      {pane}
      <PaneInspectorDrawer
        size={drawerSize}
        handle={inspectorHandle}
        yielded={yielded}
        reveal={reveal}
        onRevealChange={onRevealChange}
        aria-label={props['aria-label']}
        aria-labelledby={props['aria-labelledby']}
      >
        {yielded ? children : null}
      </PaneInspectorDrawer>
    </>
  )
}

PaneRoot.displayName = 'Pane.Root'
