'use client'

import {
  type ComponentProps,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { mergeRefs } from '../../utils/mergeRefs'
import { scrollToTop as scrollToTopOf } from '../../utils/reducedMotion'
import { ScrollArea } from '../ScrollArea'
import { PANE_CHROME_NONE, PaneChromeContext } from './PaneChromeContext'
import { PaneContext } from './PaneContext'
import {
  PaneKindContext,
  PaneStackContext,
  isOverflowKind
} from './PaneStackContext'
import { PANE_DEEP, PANE_MAX_DEPTH, ROLE_DEPTH } from './paneDepth'
import {
  historyEntryKey,
  recallPaneScroll,
  rememberPaneScroll,
  restorePaneScroll
} from './paneScroll'
import {
  type PaneEmphasis,
  type PanePrimaryNav,
  type PaneRole,
  paneVariants,
  paneViewportVariants
} from './variants'

// Base UI writes overflow inline, so a class can't clip the x axis.
const CLIP_HORIZONTAL = { overflowX: 'clip' } as const

// ScrollArea hard-codes role=presentation; the element's own undefined role removes it.
const SECTION = <section role={undefined} />

// Omit, not intersect: a duplicate declaration drops the prop from docgen.
export type PaneRootProps = Omit<ComponentProps<'section'>, 'role'> & {
  /** Sets the default depth. An `inspector` gives up its column first. @default 'list' */
  role?: PaneRole
  /** The deepest `current` pane is the top of the stack. @default false */
  current?: boolean
  /** Position in the drill-down, from 0 with no gaps. Defaults from `role`. */
  depth?: 0 | 1 | 2 | 3
  /** The surface. `subtler` paints none. @default 'raised' */
  emphasis?: PaneEmphasis
  /** What the phone bar does while this pane is on top. `auto` collapses it on scroll. @default 'auto' */
  primaryNav?: PanePrimaryNav
}

// Hysteresis, so a 1px scroll can't oscillate the title. Exported for tests.
export const COLLAPSE_AT = 64
export const EXPAND_AT = 40

export function PaneRoot({
  className,
  role = 'list',
  current = false,
  depth: declaredDepth,
  emphasis = 'raised',
  primaryNav = 'auto',
  ref: forwardedRef,
  children,
  ...props
}: PaneRootProps) {
  const stackFromContext = use(PaneStackContext)
  const surroundingPane = use(PaneContext)
  // A pane inside a pane's content is content, not a stack sibling.
  const stack = surroundingPane === null ? stackFromContext : null
  const kind = use(PaneKindContext)
  const paneId = useId()
  const paneRef = useRef<HTMLElement | null>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [bodyTitle, setBodyTitleState] = useState<ReactNode | null>(null)

  // Functional form: a ReactNode can be a function.
  const setBodyTitle = useCallback(
    (node: ReactNode | null) => setBodyTitleState(() => node),
    []
  )

  const setPaneRef = useMemo(
    () => mergeRefs<HTMLElement>(paneRef, forwardedRef),
    [forwardedRef]
  )

  // Keyed on register/unregister, not the stack object, which changes on every registration.
  const register = stack?.register
  const unregister = stack?.unregister
  useEffect(() => {
    const node = paneRef.current
    if (!register || !unregister || !node) return
    register(paneId, node, {
      role,
      current,
      primaryNav,
      kind,
      depth: declaredDepth
    })
    return () => unregister(paneId)
  }, [
    register,
    unregister,
    paneId,
    role,
    current,
    primaryNav,
    kind,
    declaredDepth
  ])

  const place = stack?.placeOf(paneId, {
    role,
    current,
    primaryNav,
    kind,
    depth: declaredDepth
  })
  // An inspector sits off the stack whatever depth it declares, so it never goes up a level.
  const depth =
    role === 'inspector'
      ? null
      : place
        ? place.depth
        : (declaredDepth ?? ROLE_DEPTH[role])
  const position = place?.position ?? null
  const chrome = place?.chrome ?? PANE_CHROME_NONE
  // No orchestrator, nothing to close back to.
  const isRoot = place?.isRoot ?? true
  // On screen but out of the stack, so nothing is announced or focused twice.
  const exit = place?.exit
  const isOverflow = isOverflowKind(kind)
  // A pane mounting or moving slides; More does not, it's a tab switch.
  const markPushing = isOverflow ? undefined : stack?.markPushing
  useInsertionEffect(() => {
    markPushing?.()
    return () => markPushing?.()
  }, [markPushing, current, depth])

  const inStack = stack !== null && role !== 'inspector'
  const { scrollPastAt, onScrollPast, onScrollDown } = chrome
  const reportsNav = primaryNav === 'auto' && onScrollPast !== undefined
  const navAt = reportsNav ? scrollPastAt : undefined

  // What a pane's scroll is filed under, surviving the re-make a page step
  // makes of it, which `useId` would not. The declared depth, not the resolved
  // one, which is its role's default until it registers a commit later.
  const seat = `${stack?.level ?? 0}:${role}:${declaredDepth ?? 'auto'}`

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
      setBodyTitle
    }),
    [depth, collapsed, scrollToTop, isRoot, bodyTitle, setBodyTitle]
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
          // A pane an ancestor hides has no box, and its zero rects would
          // otherwise read as scrolled past: it would open already collapsed.
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
    // Read here, not while rendering. No entries, nothing to come back to.
    const entry = historyEntryKey()
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
        // As it happens, not when the route changes: React replaces the
        // content before any effect runs, and the viewport clamps the scroll
        // the new content has no room for, losing the place to come back to.
        if (entry !== null) rememberPaneScroll(entry, seat, top)
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
    const last = shown.current
    const entry = historyEntryKey()
    shown.current = { destination, position }
    const viewport = viewportRef.current
    if (!viewport) return
    settling.current()
    const back = entry === null ? undefined : recallPaneScroll(entry, seat)
    const first = !mounted.current
    mounted.current = true
    // An entry this pane has been scrolled on wins over every reason to start
    // at the top: going back is the one arrival that is not new. Checked before
    // the guards below, which read a stack snapshot a commit behind and so
    // cannot say yet whether this pane is the one being navigated to.
    if (back !== undefined) {
      settling.current = restorePaneScroll(viewport, back)
      return
    }
    // `current`, not the position, for "this pane is the one being navigated
    // to": the position comes from a snapshot a commit behind, so on a push the
    // pane going behind still reads as the top and would lose its place.
    if (
      first ||
      !current ||
      last.destination === destination ||
      last.position === 'behind' ||
      position === 'behind'
    ) {
      return
    }
    viewport.scrollTop = 0
  }, [destination, position, seat, current])

  return (
    <ScrollArea
      render={SECTION}
      data-slot='pane'
      data-role={role}
      data-stack-position={position ?? undefined}
      data-depth={
        depth === null ? undefined : depth > PANE_MAX_DEPTH ? PANE_DEEP : depth
      }
      data-stack={inStack ? '' : undefined}
      data-current={current ? '' : undefined}
      data-level={stack?.level}
      data-overflow={isOverflow ? '' : undefined}
      data-exiting={exit === undefined ? undefined : ''}
      data-exit={exit}
      inert={exit === undefined ? undefined : true}
      aria-hidden={exit === undefined ? undefined : true}
      data-primary-nav={primaryNav}
      className={cn(paneVariants({ emphasis }), className)}
      {...props}
      ref={setPaneRef}
    >
      <ScrollArea.Viewport
        ref={viewportRef}
        data-slot='pane-viewport'
        className={paneViewportVariants({
          clearsPrimaryNav: primaryNav !== 'hidden'
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
            <PaneContext value={context}>{children}</PaneContext>
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
}

PaneRoot.displayName = 'Pane.Root'
