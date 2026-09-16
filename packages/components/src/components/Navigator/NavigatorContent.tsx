'use client'

import {
  Children,
  type ComponentProps,
  isValidElement,
  use,
  useCallback,
  useEffect,
  useInsertionEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { usePendingNavigationStore } from '../../providers/PendingNavigationContext'
import { isDev } from '../../utils/isDev'
import { mergeRefs } from '../../utils/mergeRefs'
import { PANE_CHROME_NONE } from '../Pane/PaneChromeContext'
import { PaneContext } from '../Pane/PaneContext'
import { PaneHeader } from '../Pane/PaneHeader'
import {
  PaneKindContext,
  type PaneRegistration,
  PaneStackContext,
  type PaneStackContextValue,
  isOverflowKind,
  isSectionKind
} from '../Pane/PaneStackContext'
import { PaneTitle } from '../Pane/PaneTitle'
import { PANE_DEEP, PANE_MAX_DEPTH } from '../Pane/paneDepth'
import type { PaneRole } from '../Pane/variants'
import {
  NavigatorActionsContext,
  NavigatorDisclosureContext,
  NavigatorSelectionContext,
  isActiveValue,
  isSectionActive
} from './NavigatorContext'
import { NavigatorOverflowItems } from './NavigatorOverflowItems'
import { NavigatorOverflowPane } from './NavigatorOverflowPane'
import { type NavigatorPageAt, NavigatorPageStep } from './NavigatorPageStep'
import { NavigatorSecondaryPane } from './NavigatorSecondaryPane'
import { NavigatorSectionPane } from './NavigatorSectionPane'
import { OVERFLOW_LABEL } from './mobileSlots'
import {
  type DepthEntry,
  type PaneEntry,
  derivePositions,
  deriveRootIndex,
  deriveTopIndex,
  orderByDocumentPosition,
  provisionalDepth,
  provisionalPosition,
  resolveDepths
} from './paneStack'
import { textOf } from './splitSecondary'
import { useTopPaneChrome } from './useTopPaneChrome'
import { navigatorContentClass, navigatorPanesClass } from './variants'

export type NavigatorContentProps = ComponentProps<'main'>

type RegisteredPane = { id: string; node: HTMLElement } & PaneRegistration

const SECTION_ROOT: DepthEntry = { role: 'list', kind: 'generated-section' }
const OPEN_MORE: DepthEntry = {
  role: 'list',
  kind: 'generated-overflow',
  current: true
}

// Long enough for the style change to land; a transition, once started, outlives it.
function flagForTwoFrames(
  node: Element,
  name: string,
  frame: { current: number }
) {
  node.setAttribute(name, '')
  cancelAnimationFrame(frame.current)
  frame.current = requestAnimationFrame(() => {
    frame.current = requestAnimationFrame(() => node.removeAttribute(name))
  })
}

/** A pane in the row, as the DOM holds it once the commit's mutations have run. */
type PaneShape = PaneEntry & { node: Element }

// `deep` is past the deepest named rank, and is the one value that isn't a number.
const rankOf = (depth: string | null) =>
  depth === PANE_DEEP ? PANE_MAX_DEPTH + 1 : Number(depth ?? 0)

const shapeOf = (row: HTMLElement, level: number): PaneShape[] =>
  Array.from(
    row.querySelectorAll(
      `[data-slot="pane"][data-stack][data-level="${level}"]`
    ),
    (node) => ({
      node,
      current: node.hasAttribute('data-current'),
      role: (node.getAttribute('data-role') ?? 'list') as PaneRole,
      rank: rankOf(node.getAttribute('data-depth'))
    })
  )

// Nodes only, not `current`: opening More or a section list flips `current` on a
// pane that was already there, and a disclosure moving is not content arriving.
const sameNodes = (was: readonly PaneShape[], now: readonly PaneShape[]) =>
  was.length === now.length &&
  was.every((pane, at) => now[at]?.node === pane.node)

// A sibling swap: the row's shape is unchanged — the same panes in the same
// document order, so the same depths and the same top — and at least one of
// them is a different element. That is a route rendering a sibling detail, as a
// param change does, and it cuts like More and a section change do. A push adds
// a pane and a pop drops one, so neither reaches here and both keep their slide.
function isSiblingSwap(was: readonly PaneShape[], now: readonly PaneShape[]) {
  if (was.length === 0 || was.length !== now.length) return false
  let swapped = false
  for (const [at, pane] of was.entries()) {
    const next = now[at]
    if (!next || next.current !== pane.current) return false
    if (next.node !== pane.node) swapped = true
  }
  return swapped
}

type Drawn = {
  /** The active section has a list, drawn or displaced by More. */
  rootList: boolean
  rootListDrawn: boolean
  sectionPane: boolean
  overflow: boolean
  moreOpen: boolean
}

// What this render draws, not the snapshot, which learns of a pane a commit late.
function depthsOf(panes: readonly RegisteredPane[], draws: Drawn) {
  const drawn = panes.filter((pane) => {
    if (pane.kind === 'generated-section') return draws.sectionPane
    if (pane.kind === 'section') return draws.rootListDrawn
    if (pane.kind === 'generated-overflow') return draws.overflow
    return true
  })
  const rootPending =
    draws.rootList && !drawn.some((pane) => isSectionKind(pane.kind))
  const morePending =
    draws.moreOpen && !drawn.some((pane) => isOverflowKind(pane.kind))
  const held = [
    ...(rootPending ? [SECTION_ROOT] : []),
    ...(morePending ? [OPEN_MORE] : [])
  ]
  const resolved = resolveDepths([...held, ...drawn])
  const shift = held.length
  return new Map(
    drawn.map((pane, index) => [pane.id, resolved[index + shift] ?? null])
  )
}

/** Arranges panes and decides which is the top of the stack. */
export function NavigatorContent({
  className,
  children,
  ref: forwardedRef,
  ...props
}: NavigatorContentProps) {
  const { setPrimaryNav } = use(NavigatorActionsContext)
  const {
    value,
    collected,
    activeSection,
    listPaneShows,
    declaredSecondaryPanes,
    showList
  } = use(NavigatorSelectionContext)
  const { overflowItems, overflowOpen } = use(NavigatorDisclosureContext)
  const parentStack = use(PaneStackContext)
  const level = parentStack === null ? 0 : parentStack.level + 1

  const contentRef = useRef<HTMLElement | null>(null)
  const ref = useMemo(() => mergeRefs(contentRef, forwardedRef), [forwardedRef])
  const rowRef = useRef<HTMLDivElement | null>(null)
  const sectionValue = activeSection?.value ?? null
  // The top-level item the route sits under. A section is one of these and a
  // plain item is not, so this also catches a switch that lands deep in the
  // incoming item: the stack changes shape, but it is still a tab switch.
  const tabValue =
    collected.ordered.find((slot) => isSectionActive(slot, value))?.value ??
    null

  // Panes slide only on a push or pop; a resize cuts.
  const pushFrame = useRef(0)
  const instantFrame = useRef(0)
  // Panes arriving with the row are the first paint, not a push: a fresh load
  // of a deep route, or hydration, must not slide.
  const pushable = useRef(false)
  const markPushing = useCallback(() => {
    if (pushable.current && rowRef.current)
      flagForTwoFrames(rowRef.current, 'data-pushing', pushFrame)
  }, [])
  // Cancels a push marked this commit and holds every pane still for two frames.
  const cut = useCallback(() => {
    const row = rowRef.current
    if (row) {
      cancelAnimationFrame(pushFrame.current)
      row.removeAttribute('data-pushing')
    }
    if (contentRef.current) {
      flagForTwoFrames(contentRef.current, 'data-instant', instantFrame)
    }
  }, [])
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      pushable.current = true
    })
    return () => {
      cancelAnimationFrame(frame)
      cancelAnimationFrame(pushFrame.current)
      cancelAnimationFrame(instantFrame.current)
    }
  }, [])

  // The Map serves effects, which run before the snapshot re-renders.
  const panes = useRef(new Map<string, RegisteredPane>())
  const [registered, setRegistered] = useState<readonly RegisteredPane[]>([])

  const register = useCallback(
    (id: string, node: HTMLElement, entry: PaneRegistration) => {
      panes.current.set(id, { id, node, ...entry })
      setRegistered(Array.from(panes.current.values()))
    },
    []
  )

  const unregister = useCallback((id: string) => {
    panes.current.delete(id)
    setRegistered(Array.from(panes.current.values()))
  }, [])

  // More's `current` follows overflowOpen so it is top in the commit it opens.
  const ordered = useMemo(
    () =>
      orderByDocumentPosition(registered).map((pane) =>
        isOverflowKind(pane.kind) ? { ...pane, current: overflowOpen } : pane
      ),
    [registered, overflowOpen]
  )
  // The children scans avoid a first-render flicker; registration finds a wrapped declaration.
  const declaredOverflow =
    Children.toArray(children).some(
      (child) => isValidElement(child) && child.type === NavigatorOverflowPane
    ) || ordered.some((pane) => pane.kind === 'overflow')
  const directOverrides = Children.toArray(children).flatMap((child) =>
    isValidElement<{ value: string }>(child) &&
    child.type === NavigatorSecondaryPane
      ? [child.props.value]
      : []
  )
  const overridden =
    activeSection !== null &&
    (declaredSecondaryPanes.has(activeSection.value) ||
      directOverrides.includes(activeSection.value))

  const generatesOverflow =
    !declaredOverflow &&
    overflowItems.horizontal.length + overflowItems.vertical.length > 0
  // `showMore` with nothing folded has no pane to show; the row stays as if closed.
  const moreOpen = overflowOpen && (declaredOverflow || generatesOverflow)

  const rootList = activeSection !== null && listPaneShows
  const rootListDrawn = rootList && !moreOpen
  const showsSectionPane = rootListDrawn && !overridden

  const draws = useMemo<Drawn>(
    () => ({
      rootList,
      rootListDrawn,
      sectionPane: showsSectionPane,
      overflow: generatesOverflow,
      moreOpen
    }),
    [rootList, rootListDrawn, showsSectionPane, generatesOverflow, moreOpen]
  )
  const depths = useMemo(() => depthsOf(ordered, draws), [ordered, draws])

  const onSectionRoute =
    activeSection !== null && isActiveValue(activeSection.value, value)
  const revealing = listPaneShows && !moreOpen && (onSectionRoute || showList)
  // A page-root section draws every route in one pane, so a step between them
  // moves no pane: the page as it was stands in, copied before React replaces
  // it. The only copy left in the row, and only here.
  const pageAt: NavigatorPageAt =
    activeSection?.root === 'page' && !moreOpen && !revealing
      ? onSectionRoute
        ? 'root'
        : 'child'
      : null
  // Open More is the root and the top; closed, it is never reached.
  const revealRoot = revealing || moreOpen
  const stack = useMemo(
    () =>
      ordered.map((pane) => ({
        ...pane,
        rank: isOverflowKind(pane.kind)
          ? pane.current
            ? -1
            : Infinity
          : (depths.get(pane.id) ?? provisionalDepth(pane) ?? Infinity)
      })),
    [ordered, depths]
  )
  const positions = useMemo(
    () => derivePositions(stack, revealRoot),
    [stack, revealRoot]
  )
  useInsertionEffect(() => markPushing(), [markPushing, revealing])

  // More and a section change are tab switches, not pushes. Declared after every
  // markPushing call, so it cancels a push marked this commit.
  // Keyed on moreOpen, not overflowOpen: a resize or hydration can add or drop More without overflowOpen changing.
  const lastTab = useRef({ moreOpen, sectionValue, tabValue })
  useInsertionEffect(() => {
    const last = lastTab.current
    if (
      last.moreOpen === moreOpen &&
      last.sectionValue === sectionValue &&
      last.tabValue === tabValue
    ) {
      return
    }
    lastTab.current = { moreOpen, sectionValue, tabValue }
    cut()
  }, [moreOpen, sectionValue, tabValue, cut])

  // Reads the DOM, not the snapshot, and after the children's own insertion
  // effects: the row is mutated by now whichever order the panes registered in,
  // so a pane that arrives before the one it replaces leaves reads the same.
  const shape = useRef<readonly PaneShape[]>([])
  const arrived = useRef(false)
  // The top as the DOM holds it, for panes to read in their layout effects: the
  // snapshot below learns of an arriving pane a commit late and still calls the
  // pane it arrived over the top.
  const topNode = useRef<Element | null>(null)
  const topNow = useCallback(() => topNode.current, [])
  useInsertionEffect(() => {
    const row = rowRef.current
    if (!row) return
    const was = shape.current
    shape.current = shapeOf(row, level)
    topNode.current =
      shape.current[deriveTopIndex(shape.current, revealRoot)]?.node ?? null
    if (isSiblingSwap(was, shape.current)) cut()
    // A pane added, dropped or replaced is the content a navigation went for,
    // including a param change that leaves `value` alone. This is the only
    // signal for it where the engine has no Navigation API.
    if (!sameNodes(was, shape.current)) arrived.current = true
  })

  // In an effect, not the insertion effect above: settling notifies the panes,
  // and an insertion effect must not schedule a render.
  const pendingStore = usePendingNavigationStore()
  useEffect(() => {
    if (!arrived.current) return
    arrived.current = false
    pendingStore?.settle()
  })

  const topIndex = positions.indexOf('top')
  const topId = topIndex === -1 ? null : (stack[topIndex]?.id ?? null)
  const rootIndex = useMemo(() => deriveRootIndex(stack), [stack])

  const topChrome = useTopPaneChrome()
  const sectionBack = useMemo(() => {
    if (!listPaneShows || moreOpen || activeSection?.href === undefined) {
      return null
    }
    const back = {
      backHref: activeSection.href,
      backLabel: textOf(activeSection.label)
    }
    return {
      top: { ...topChrome, ...back },
      below: { ...PANE_CHROME_NONE, ...back }
    }
  }, [listPaneShows, moreOpen, activeSection, topChrome])

  // Panes register through `register` and `unregister` alone, which stay
  // stable, so this lookup can change with the stack without looping.
  const placeOf = useCallback(
    (id: string, entry: PaneRegistration) => {
      const index = stack.findIndex((pane) => pane.id === id)
      const position =
        index === -1
          ? provisionalPosition(entry, revealRoot)
          : // The snapshot learns of a `current` flip a commit late; the pane knows now.
            stack[index]?.current === entry.current
            ? (positions[index] ?? null)
            : (derivePositions(
                stack.map((pane, at) =>
                  at === index ? { ...pane, current: entry.current } : pane
                ),
                revealRoot
              )[index] ?? null)
      const resolved = depths.get(id)
      const depth = resolved === undefined ? provisionalDepth(entry) : resolved
      const top = position === 'top'
      const chrome =
        sectionBack === null || position === 'ahead' || depth !== 1
          ? top
            ? topChrome
            : PANE_CHROME_NONE
          : top
            ? sectionBack.top
            : sectionBack.below
      return {
        position,
        depth,
        chrome,
        isRoot: index !== -1 && index === rootIndex
      }
    },
    [stack, positions, revealRoot, depths, topChrome, sectionBack, rootIndex]
  )

  const stackValue = useMemo<PaneStackContextValue>(
    () => ({
      register,
      unregister,
      placeOf,
      markPushing,
      topNow,
      moreOpen,
      level,
      destination: value
    }),
    [register, unregister, placeOf, markPushing, topNow, moreOpen, level, value]
  )

  // Reads the ref, not `ordered`: child effects have registered by now, the render hadn't.
  const hasChildren = children != null && children !== false
  useEffect(() => {
    if (!isDev() || !hasChildren) return
    const declared = Array.from(panes.current.values()).some(
      (pane) =>
        pane.kind === 'pane' ||
        pane.kind === 'section' ||
        pane.kind === 'overflow'
    )
    if (!declared) {
      console.warn(
        '[Roadie] Navigator.Content has children but no Pane registered.'
      )
    }
  }, [hasChildren, registered])

  // The live Map, not `ordered`: a pane unmounting this commit is still in the render's snapshot.
  const warned = useRef(new Set<string>())
  useEffect(() => {
    if (!isDev()) return
    const live = orderByDocumentPosition(Array.from(panes.current.values()))
    const resolved = depthsOf(live, draws)
    for (const pane of live) {
      const depth = resolved.get(pane.id) ?? null
      const declared = provisionalDepth(pane)
      if (depth === null || declared === null || depth <= declared) continue
      const message = `[Roadie] A Pane sits at depth ${depth} but declares ${declared}; declare depth={${depth}} for SSR.`
      if (warned.current.has(message)) continue
      warned.current.add(message)
      console.warn(message)
    }
  }, [registered, draws])

  const topPrimaryNav =
    stack.find((pane) => pane.id === topId)?.primaryNav ?? 'auto'
  useEffect(() => {
    setPrimaryNav(topPrimaryNav)
  }, [topPrimaryNav, setPrimaryNav])

  const fallbackOverflow = generatesOverflow ? (
    <PaneKindContext value='generated-overflow' key='__navigator-overflow'>
      <NavigatorOverflowPane>
        <PaneHeader>
          <PaneTitle>{OVERFLOW_LABEL}</PaneTitle>
        </PaneHeader>
        <NavigatorOverflowItems />
      </NavigatorOverflowPane>
    </PaneKindContext>
  ) : null

  // Keyed so the search resets with the section; More replaces it while open.
  const sectionPane = showsSectionPane ? (
    <NavigatorSectionPane key={activeSection.value} section={activeSection} />
  ) : null

  return (
    <main
      ref={ref}
      data-slot='navigator-content'
      className={cn(navigatorContentClass, className)}
      {...props}
    >
      <PaneStackContext value={stackValue}>
        {/* Resets to stack level so a nested Navigator registers its own panes. */}
        <PaneContext value={null}>
          <div
            ref={rowRef}
            data-slot='navigator-panes'
            data-level={level}
            data-reveal={revealRoot ? '' : undefined}
            data-overflow={moreOpen ? '' : undefined}
            className={navigatorPanesClass}
          >
            {sectionPane}
            {children}
            {fallbackOverflow}
            <NavigatorPageStep
              section={activeSection}
              value={value}
              at={pageAt}
              level={level}
            />
          </div>
        </PaneContext>
      </PaneStackContext>
    </main>
  )
}

NavigatorContent.displayName = 'Navigator.Content'
