'use client'

import {
  type ComponentProps,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { prefersReducedMotion } from '../../utils/reducedMotion'
import { ScrollArea } from '../ScrollArea'
import { PANE_CHROME_NONE, PaneChromeContext } from './PaneChromeContext'
import { PaneContext } from './PaneContext'
import { PaneKindContext, PaneStackContext } from './PaneStackContext'
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
   * This pane holds what the user is currently looking at. The deepest
   * `current` pane is the top of the stack. Affects only the stacked bands —
   * from `lg` up every pane is a column regardless.
   *
   * @default false
   */
  current?: boolean
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
  const frame = useRef<number | null>(null)
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

  // Forwards a consumer ref through Base UI's own ref slot, and captures the
  // node locally for registration. Base UI's ref type assumes the default
  // `<div>`; the render prop actually renders a `<section>`, which is what
  // both the consumer's ref and the registration hold.
  const setPaneRef = useCallback(
    (node: HTMLDivElement | null) => {
      paneRef.current = node as HTMLElement | null
      if (typeof forwardedRef === 'function') forwardedRef(node)
      else if (forwardedRef) forwardedRef.current = node
    },
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
    register(paneId, node, { role, current, primaryNav, kind })
    return () => unregister(paneId)
  }, [register, unregister, paneId, role, current, primaryNav, kind])

  const entry = { role, current, primaryNav, kind }
  const position = stack?.positionOf(paneId, entry) ?? null
  const chrome = stack?.chromeOf(paneId, entry) ?? PANE_CHROME_NONE
  // No `stack` means no orchestrator to be non-root of — default to root so
  // the close affordance stays off rather than closing a stack that doesn't
  // exist.
  const isRoot = stack === null ? true : stack.isRootOf(paneId)
  const { onViewportScroll, registerScroller } = chrome

  // The pane owns the coalescing because it owns the viewport; what a scroll
  // position *means* for the nav belongs to whoever filled the chrome
  // context. Collapse, though, is the pane's own state — it must be computed
  // even for a pane that has opted out of reporting to the orchestrator.
  const scrollToTop = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    viewport.scrollTo({
      top: 0,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth'
    })
  }, [])

  const context = useMemo(
    () => ({ role, collapsed, scrollToTop, isRoot, bodyTitle, setBodyTitle }),
    [role, collapsed, scrollToTop, isRoot, bodyTitle, setBodyTitle]
  )

  // Collapse is read straight off the event — it's a cheap comparison React
  // already batches, and the cross-fade should track the same frame the
  // browser paints the scroll in. Reporting to the orchestrator is the
  // expensive part worth coalescing: one frame in flight at a time, since a
  // scroll fires many times per frame on a phone and an uncoalesced
  // read-then-report would re-render the orchestrator on each one.
  const handleScroll = () => {
    const viewport = viewportRef.current
    if (!viewport) return
    const top = viewport.scrollTop
    setCollapsed((was) => (was ? top > EXPAND_AT : top > COLLAPSE_AT))

    if (frame.current !== null) return
    frame.current = requestAnimationFrame(() => {
      frame.current = null
      // A pane that has opted out of `auto` is not describing scroll-linked
      // nav behaviour at all, so it stays silent rather than reporting a
      // position the orchestrator would have to learn to ignore.
      if (primaryNav !== 'auto') return
      onViewportScroll(viewport.scrollTop)
    })
  }

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    },
    []
  )

  // The viewport is what scrolls, so scrolling it is the pane's job; deciding
  // when belongs to the orchestrator, which only hands a live `registerScroller`
  // to the top of the stack. The pane calls the same `scrollToTop` on itself
  // for its own compact title, so there is one definition rather than two
  // that can drift.
  useLayoutEffect(() => {
    registerScroller(scrollToTop)
    return () => registerScroller(null)
  }, [registerScroller, scrollToTop])

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
      data-primary-nav={primaryNav}
      className={cn(
        paneVariants({ role, emphasis, stackPosition: position ?? undefined }),
        className
      )}
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
        onScroll={handleScroll}
      >
        {/* Wrapped so the scrollbar re-measures as content swaps — the
            viewport's own box never changes. `fitWidth={false}` keeps the
            wrapper at the viewport's width so wide children stay clipped
            rather than stretching it. */}
        <ScrollArea.Content fitWidth={false} className='px-(--content-inset)'>
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
