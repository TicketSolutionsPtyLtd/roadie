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
  type PaneEmphasis,
  type PanePrimaryNav,
  type PaneRole,
  paneVariants,
  paneViewportVariants
} from './variants'

// Base UI writes `overflow: scroll` inline on the viewport, so an
// `overflow-x-*` class loses. Without this a child a hair too wide drags the
// whole pane sideways. Wide children own their own horizontal scroll.
const CLIP_HORIZONTAL = { overflowX: 'clip' } as const

// `role` is omitted from the section's own props rather than intersected with
// them: the pane consumes it and never forwards it, so an intersection both
// lies about what reaches the DOM and hands react-docgen two declarations for
// one name — which is enough for it to drop the prop from the docs entirely.
export type PaneRootProps = Omit<ComponentProps<'section'>, 'role'> & {
  /**
   * What this pane is. Drives sizing defaults and yield order — an
   * `inspector` yields first when space runs short, `detail` last.
   *
   * @default 'list'
   */
  role?: PaneRole
  /**
   * The deepest `current` pane is the top of the stack, which decides which
   * panes are on screen at every width.
   *
   * @default false
   */
  current?: boolean
  /** Where this pane sits in the drill-down, from 0 at the root, compacted so there are no gaps. Defaults from `role` — `list` 0, `detail` 1. */
  depth?: 0 | 1 | 2 | 3
  /**
   * Surface treatment. Mirrors `Card`'s names, except that a pane's `subtler`
   * is **no surface at all**, so it sits directly on the sunken frame.
   *
   * @default 'raised'
   */
  emphasis?: PaneEmphasis
  /**
   * What the mobile primary nav does while this pane is the **top of the
   * stack** below `md`. A declaration on a pane sitting underneath does
   * nothing.
   *
   * - `auto` — collapses to the active tab as the pane scrolls, and returns
   *   at the top. A pane whose content does not overflow never scrolls, so
   *   nothing collapses.
   * - `visible` — the bar stays full at every scroll position.
   * - `hidden` — no bar at all; it returns when the stack pops back. This is
   *   iOS's `hidesBottomBarWhenPushed`, declared by the pushed screen.
   *
   * @default 'auto'
   */
  primaryNav?: PanePrimaryNav
}

// Hysteresis near the large title's height, so the cross-fade follows the
// title and a 1px scroll can't oscillate it. `EXPAND_AT` must stay below
// `COLLAPSE_AT`. Exported for the tests only.
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
  // A pane inside another pane's content is content, not a stack sibling —
  // the surrounding pane's own context (reset to null by `Navigator.Content`)
  // is what tells the difference from a pane declared directly in a stack.
  const stack = surroundingPane === null ? stackFromContext : null
  const kind = use(PaneKindContext)
  const paneId = useId()
  const paneRef = useRef<HTMLElement | null>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [bodyTitle, setBodyTitleState] = useState<ReactNode | null>(null)

  // Stable identity, or `Pane.BodyTitle`'s registration effect re-runs on
  // every render of this pane. The functional form is not an optimisation: a
  // `ReactNode` can be a function, which the direct form would mistake for an
  // updater and call.
  const setBodyTitle = useCallback(
    (node: ReactNode | null) => setBodyTitleState(() => node),
    []
  )

  const setPaneRef = useMemo(
    () => mergeRefs<HTMLElement>(paneRef, forwardedRef),
    [forwardedRef]
  )

  // Re-registers whenever an entry value changes, because the orchestrator
  // derives the top of the stack from `current`. Depends on `register` and
  // `unregister` themselves, not the `stack` object they come from: the
  // orchestrator hands out a new object every time a pane (de)registers, so
  // that pane's own siblings notice the stack changed shape. Depending on
  // that object here would re-run this effect on every registration —
  // registering feeding back into itself, forever.
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
  const depth = place ? place.depth : (declaredDepth ?? ROLE_DEPTH[role])
  const position = place?.position ?? null
  const chrome = place?.chrome ?? PANE_CHROME_NONE
  // No orchestrator, nothing to close back to.
  const isRoot = place?.isRoot ?? true
  const isOverflow = isOverflowKind(kind)
  // Mounting, unmounting or moving a pane is a navigation; the stack slides for
  // it. Not More: it mounts when a resize folds items, and opens as a tab switch.
  const markPushing = isOverflow ? undefined : stack?.markPushing
  useInsertionEffect(() => {
    markPushing?.()
    return () => markPushing?.()
  }, [markPushing, current, depth])

  const inStack = stack !== null && role !== 'inspector'
  const { scrollPastAt, onScrollPast, onScrollDown } = chrome
  // A pane that has opted out of `auto` describes no scroll-linked nav at all.
  const reportsNav = primaryNav === 'auto' && onScrollPast !== undefined
  const navAt = reportsNav ? scrollPastAt : undefined

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

  // Sentinels, not scroll reads: reading `scrollTop` in the scroll event forced
  // a style recalc straight after Base UI's own writes, on every event. What a
  // position means for the nav belongs to whoever filled the chrome context;
  // collapse is the pane's own, reported or not.
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
          const at = Number((entry.target as HTMLElement).dataset.scrollAt)
          past.set(
            at,
            !entry.isIntersecting &&
              entry.rootBounds !== null &&
              entry.boundingClientRect.bottom <= entry.rootBounds.top + 0.5
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

  // Direction, only while asked for: one read per frame, inside the frame,
  // never interleaved with the scroll handlers' writes.
  const reportDown = useEffectEvent(() => onScrollDown?.())
  const wantsDirection = reportsNav && onScrollDown !== undefined
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport || !wantsDirection) return
    // Once, as the pin lands; after that only inside a frame.
    let last = viewport.scrollTop
    let frame: number | null = null
    const onScroll = () => {
      if (frame !== null) return
      frame = requestAnimationFrame(() => {
        frame = null
        const top = viewport.scrollTop
        if (top > last) reportDown()
        last = top
      })
    }
    viewport.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      viewport.removeEventListener('scroll', onScroll)
      if (frame !== null) cancelAnimationFrame(frame)
    }
  }, [wantsDirection])

  // Behind the top is the pane picked from or popped back to; it keeps its place.
  const destination = stack?.destination
  const shown = useRef({ destination, position })
  useLayoutEffect(() => {
    const last = shown.current
    shown.current = { destination, position }
    const viewport = viewportRef.current
    if (
      !viewport ||
      last.destination === destination ||
      last.position === 'behind' ||
      position === 'behind'
    ) {
      return
    }
    viewport.scrollTop = 0
  }, [destination, position])

  return (
    <ScrollArea
      // A function render, not `<section />`: `ScrollAreaRoot` hard-codes
      // `role: 'presentation'` on its own props (unrelated to the pane's
      // `role` prop, which never reaches the DOM). Overriding with
      // `undefined` removes the attribute rather than changing what landmark
      // a future `aria-label`'d pane exposes.
      render={(renderProps) => <section {...renderProps} role={undefined} />}
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
        {/* Wrapped so the scrollbar re-measures as content swaps — the
            viewport's own box never changes. `fitWidth={false}` keeps the
            wrapper at the viewport's width so wide children stay clipped
            rather than stretching it. */}
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
      {/* `keepMounted` so the margin binds before overflow is measured. The
          margin clears the header's live height, which `Pane.Header`
          republishes as it resizes, so it needs no transition of its own. */}
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
