'use client'

import {
  Children,
  type ReactNode,
  isValidElement,
  use,
  useCallback,
  useEffect,
  useInsertionEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer'

import { usePendingNavigationStore } from '../../providers/PendingNavigationContext'
import { isDev } from '../../utils/isDev'
import { PANE_CHROME_NONE } from '../Pane/PaneChromeContext'
import { PaneContext } from '../Pane/PaneContext'
import { PaneHeader } from '../Pane/PaneHeader'
import { PaneInspectorContext } from '../Pane/PaneInspectorContext'
import {
  PaneKindContext,
  type PaneRegistration,
  PaneStackContext,
  type PaneStackContextValue,
  isOverflowKind,
  isSecondaryKind
} from '../Pane/PaneStackContext'
import { PaneTitle } from '../Pane/PaneTitle'
import { PANE_DEEP, PANE_MAX_DEPTH } from '../Pane/paneDepth'
import type { PaneColumn } from '../Pane/variants'
import {
  NavigatorActionsContext,
  NavigatorDisclosureContext,
  NavigatorSelectionContext,
  isActiveValue,
  isDestinationActive
} from './NavigatorContext'
import { NavigatorGeneratedSecondaryPane } from './NavigatorGeneratedSecondaryPane'
import { NavigatorOverflowItems } from './NavigatorOverflowItems'
import { NavigatorOverflowPane } from './NavigatorOverflowPane'
import { type NavigatorPageAt, NavigatorPageStep } from './NavigatorPageStep'
import { NavigatorSecondaryPane } from './NavigatorSecondaryPane'
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

type PlacedPane = { id: string } & PaneRegistration
type RegisteredPane = PlacedPane & { node: HTMLElement }
/** Where a pane rendered while hydrating: `written` is drawn, `rank` is what registration should resolve. */
type RenderClaim = {
  pane: PlacedPane
  written: number | null
  rank: number | null
}

const SECONDARY_ROOT: DepthEntry = {
  column: 'list',
  kind: 'generated-secondary'
}
const OPEN_MORE: DepthEntry = {
  column: 'list',
  kind: 'generated-overflow',
  reached: true
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
      reached: node.hasAttribute('data-reached'),
      column: (node.getAttribute('data-column') ?? 'detail') as PaneColumn,
      rank: rankOf(node.getAttribute('data-depth'))
    })
  )

// Nodes only: More or a secondary list flips `reached` without content arriving.
const sameNodes = (was: readonly PaneShape[], now: readonly PaneShape[]) =>
  was.length === now.length &&
  was.every((pane, at) => now[at]?.node === pane.node)

// Same shape, different element: a route rendering a sibling detail, which cuts.
function isSiblingSwap(was: readonly PaneShape[], now: readonly PaneShape[]) {
  if (was.length === 0 || was.length !== now.length) return false
  let swapped = false
  for (const [at, pane] of was.entries()) {
    const next = now[at]
    if (!next || next.reached !== pane.reached) return false
    if (next.node !== pane.node) swapped = true
  }
  return swapped
}

type Drawn = {
  /** The active secondary has a list, drawn or displaced by More. */
  rootList: boolean
  rootListDrawn: boolean
  secondaryPane: boolean
  overflow: boolean
  moreOpen: boolean
}

// What this render draws, not the snapshot, which learns of a pane a commit late.
function depthsOf(panes: readonly PlacedPane[], draws: Drawn) {
  const drawn = panes.filter((pane) => {
    if (pane.kind === 'generated-secondary') return draws.secondaryPane
    if (pane.kind === 'secondary') return draws.rootListDrawn
    if (pane.kind === 'generated-overflow') return draws.overflow
    return true
  })
  const rootPending =
    draws.rootList && !drawn.some((pane) => isSecondaryKind(pane.kind))
  const morePending =
    draws.moreOpen && !drawn.some((pane) => isOverflowKind(pane.kind))
  const held = [
    ...(rootPending ? [SECONDARY_ROOT] : []),
    ...(morePending ? [OPEN_MORE] : [])
  ]
  const resolved = resolveDepths([...held, ...drawn])
  const shift = held.length
  return new Map(
    drawn.map((pane, index) => [pane.id, resolved[index + shift] ?? null])
  )
}

// True when this row's ranks sit one shallower than the written scale.
function liftOf(
  panes: readonly PlacedPane[],
  depths: ReadonlyMap<string, number | null>
): boolean {
  const first = panes.find((pane) => (depths.get(pane.id) ?? null) !== null)
  return (
    first !== undefined &&
    depths.get(first.id) === 0 &&
    (provisionalDepth(first) ?? 0) > 0
  )
}

// A declared depth wins; a row opening on a detail is written from 1 so More can take 0.
function renderOrderDepth(
  panes: readonly PlacedPane[],
  draws: Drawn
): Omit<RenderClaim, 'pane'> {
  const pane = panes.at(-1)
  if (pane?.depth !== undefined) {
    const written = provisionalDepth(pane)
    return { written, rank: written }
  }
  const depths = depthsOf(panes, draws)
  const rank = pane ? (depths.get(pane.id) ?? null) : null
  const lift = liftOf(panes, depths)
  return { written: rank === null ? null : rank + (lift ? 1 : 0), rank }
}

/** Arranges panes and decides which is the top of the stack. */
export function NavigatorContent({ children }: { children?: ReactNode }) {
  const { setTabBar } = use(NavigatorActionsContext)
  const {
    value,
    collected,
    activeSecondary,
    listPaneShows,
    declaredSecondaryPanes,
    showList
  } = use(NavigatorSelectionContext)
  const { overflowItems, overflowOpen } = use(NavigatorDisclosureContext)
  const parentStack = use(PaneStackContext)
  const level = parentStack === null ? 0 : parentStack.level + 1

  const contentRef = useRef<HTMLElement | null>(null)
  const rowRef = useRef<HTMLDivElement | null>(null)
  const secondaryValue = activeSecondary?.value ?? null
  // So a switch landing deep in another destination still reads as a tab switch.
  const tabValue =
    collected.ordered.find((slot) => isDestinationActive(slot, value))?.value ??
    null

  // Panes slide only on a push or pop; a resize cuts.
  const pushFrame = useRef(0)
  const instantFrame = useRef(0)
  // The row's first paint (fresh load, hydration) must not slide.
  const pushable = useRef(false)
  const markPushing = useCallback(() => {
    if (pushable.current && rowRef.current)
      flagForTwoFrames(rowRef.current, 'data-pushing', pushFrame)
  }, [])
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
    // Frame ids, not nodes: unmounting cancels whichever frame is pending then.
    const pending = [pushFrame, instantFrame]
    return () => {
      cancelAnimationFrame(frame)
      for (const ref of pending) cancelAnimationFrame(ref.current)
    }
  }, [])

  // The Map serves effects, which run before the snapshot re-renders.
  const panes = useRef(new Map<string, RegisteredPane>())
  // Fizz and hydration both walk the row in document order; keyed by `useId` so StrictMode claims once.
  const claims = useRef(new Map<string, RenderClaim>())
  const claimRenderedDepth = useCallback(
    (id: string, entry: PaneRegistration, draws: Drawn) => {
      const claimed = claims.current.get(id)
      if (claimed) return claimed.written
      const before = Array.from(claims.current.values(), ({ pane }) => pane)
      const pane = { id, ...entry }
      const claim = { pane, ...renderOrderDepth([...before, pane], draws) }
      claims.current.set(id, claim)
      return claim.written
    },
    []
  )
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

  // More's `reached` follows overflowOpen so it is top in the commit it opens.
  const ordered = useMemo(
    () =>
      orderByDocumentPosition(registered).map((pane) =>
        isOverflowKind(pane.kind) ? { ...pane, reached: overflowOpen } : pane
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
    activeSecondary !== null &&
    (declaredSecondaryPanes.has(activeSecondary.value) ||
      directOverrides.includes(activeSecondary.value))

  const generatesOverflow =
    !declaredOverflow &&
    overflowItems.horizontal.length + overflowItems.vertical.length > 0
  // `showMore` with nothing folded has no pane to show; the row stays as if closed.
  const moreOpen = overflowOpen && (declaredOverflow || generatesOverflow)

  const rootList = activeSecondary !== null && listPaneShows
  const rootListDrawn = rootList && !moreOpen
  const showsSecondaryPane = rootListDrawn && !overridden

  const draws = useMemo<Drawn>(
    () => ({
      rootList,
      rootListDrawn,
      secondaryPane: showsSecondaryPane,
      overflow: generatesOverflow,
      moreOpen
    }),
    [rootList, rootListDrawn, showsSecondaryPane, generatesOverflow, moreOpen]
  )
  const depths = useMemo(() => depthsOf(ordered, draws), [ordered, draws])

  const onDestinationRoute =
    activeSecondary !== null && isActiveValue(activeSecondary.value, value)
  const revealing =
    listPaneShows && !moreOpen && (onDestinationRoute || showList)
  // An overview draws every route in one pane, so a step keeps a copy of the page as it was.
  const pageAt: NavigatorPageAt =
    activeSecondary?.overview && !moreOpen && !revealing
      ? onDestinationRoute
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
          ? pane.reached
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

  // After every markPushing, so it cancels this commit's push. moreOpen, not overflowOpen: a resize can toggle More.
  const lastTab = useRef({ moreOpen, secondaryValue, tabValue })
  useInsertionEffect(() => {
    const last = lastTab.current
    if (
      last.moreOpen === moreOpen &&
      last.secondaryValue === secondaryValue &&
      last.tabValue === tabValue
    ) {
      return
    }
    lastTab.current = { moreOpen, secondaryValue, tabValue }
    cut()
  }, [moreOpen, secondaryValue, tabValue, cut])

  // Reads the DOM after insertion effects, so pane registration order doesn't matter.
  const shape = useRef<readonly PaneShape[]>([])
  const arrived = useRef(false)
  // The snapshot learns of an arriving pane a commit late.
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
    // The only arrival signal where the engine lacks the Navigation API.
    if (!sameNodes(was, shape.current)) arrived.current = true
  })

  // An insertion effect must not schedule a render.
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
  const secondaryBack = useMemo(() => {
    if (!listPaneShows || moreOpen || activeSecondary?.href === undefined) {
      return null
    }
    const back = {
      backHref: activeSecondary.href,
      backLabel: textOf(activeSecondary.label)
    }
    return {
      top: { ...topChrome, ...back },
      below: { ...PANE_CHROME_NONE, ...back }
    }
  }, [listPaneShows, moreOpen, activeSecondary, topChrome])

  // Only the stable `register`/`unregister` change the stack, so these deps can't loop.
  const placeOf = useCallback(
    (id: string, entry: PaneRegistration, hydrating = false) => {
      const index = stack.findIndex((pane) => pane.id === id)
      const position =
        index === -1
          ? provisionalPosition(entry, revealRoot)
          : // The snapshot learns of a `reached` flip a commit late; the pane knows now.
            stack[index]?.reached === entry.reached
            ? (positions[index] ?? null)
            : (derivePositions(
                stack.map((pane, at) =>
                  at === index ? { ...pane, reached: entry.reached } : pane
                ),
                revealRoot
              )[index] ?? null)
      const resolved = depths.get(id)
      const registered = resolved !== undefined
      const depth = registered
        ? resolved
        : hydrating
          ? claimRenderedDepth(id, entry, draws)
          : provisionalDepth(entry)
      const top = position === 'top'
      const chrome =
        secondaryBack === null || position === 'ahead' || depth !== 1
          ? top
            ? topChrome
            : PANE_CHROME_NONE
          : top
            ? secondaryBack.top
            : secondaryBack.below
      return {
        position,
        depth,
        chrome,
        isRoot: index !== -1 && index === rootIndex,
        registered
      }
    },
    [
      stack,
      positions,
      revealRoot,
      depths,
      draws,
      claimRenderedDepth,
      topChrome,
      secondaryBack,
      rootIndex
    ]
  )

  const [inspectorHandle] = useState(() => DrawerPrimitive.createHandle())

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
        pane.kind === 'secondary' ||
        pane.kind === 'overflow'
    )
    if (!declared) {
      console.warn('[Roadie] Navigator has children but no Pane registered.')
    }
  }, [hasChildren, registered])

  // The live Map: a pane unmounting this commit is still in the render's snapshot.
  const checked = useRef(new Set<string>())
  const warned = useRef(new Set<string>())
  useEffect(() => {
    if (!isDev()) return
    const live = orderByDocumentPosition(Array.from(panes.current.values()))
    const resolved = depthsOf(live, draws)
    const lift = liftOf(live, resolved)
    for (const pane of live) {
      const claim = claims.current.get(pane.id)
      if (!claim || checked.current.has(pane.id)) continue
      checked.current.add(pane.id)
      const rank = resolved.get(pane.id) ?? null
      if (rank === null || claim.written === null || claim.rank === rank) {
        continue
      }
      const written = rank + (lift ? 1 : 0)
      const message = `[Roadie] A Pane was server-rendered at depth ${claim.written} but sits at ${written}. Render panes in document order or declare depth={${written}}.`
      if (warned.current.has(message)) continue
      warned.current.add(message)
      console.warn(message)
    }
  }, [registered, draws])

  const topTabBar = stack.find((pane) => pane.id === topId)?.tabBar ?? 'auto'
  useEffect(() => {
    setTabBar(topTabBar)
  }, [topTabBar, setTabBar])

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

  // Keyed so the search resets with the destination.
  const secondaryPane = showsSecondaryPane ? (
    <NavigatorGeneratedSecondaryPane
      key={activeSecondary.value}
      secondary={activeSecondary}
    />
  ) : null

  return (
    <main
      ref={contentRef}
      data-slot='navigator-content'
      className={navigatorContentClass}
    >
      <PaneStackContext value={stackValue}>
        <PaneInspectorContext value={inspectorHandle}>
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
              {secondaryPane}
              {children}
              {fallbackOverflow}
              <NavigatorPageStep
                secondary={activeSecondary}
                value={value}
                at={pageAt}
                level={level}
              />
            </div>
          </PaneContext>
        </PaneInspectorContext>
      </PaneStackContext>
    </main>
  )
}
