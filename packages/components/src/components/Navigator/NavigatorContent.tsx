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

import { isDev } from '../../utils/isDev'
import { mergeRefs } from '../../utils/mergeRefs'
import { PANE_CHROME_NONE } from '../Pane/PaneChromeContext'
import { PaneContext } from '../Pane/PaneContext'
import { PaneHeader } from '../Pane/PaneHeader'
import {
  type PaneRegistration,
  PaneStackContext,
  type PaneStackContextValue
} from '../Pane/PaneStackContext'
import { PaneTitle } from '../Pane/PaneTitle'
import { GeneratedOverflowContext } from './GeneratedOverflowContext'
import {
  NavigatorActionsContext,
  NavigatorDisclosureContext,
  NavigatorSelectionContext,
  isActiveValue
} from './NavigatorContext'
import { NavigatorOverflowItems } from './NavigatorOverflowItems'
import { NavigatorOverflowPane } from './NavigatorOverflowPane'
import { type NavigatorPageAt, NavigatorPageStep } from './NavigatorPageStep'
import { NavigatorSecondaryPane } from './NavigatorSecondaryPane'
import { NavigatorSectionPane } from './NavigatorSectionPane'
import { OVERFLOW_LABEL } from './mobileSlots'
import {
  type DepthEntry,
  derivePositions,
  deriveRootIndex,
  orderByDocumentPosition,
  provisionalDepth,
  provisionalPosition,
  resolveDepths
} from './paneStack'
import { textOf } from './splitSecondary'
import { useTopPaneChrome } from './useTopPaneChrome'
import { navigatorContentVariants, navigatorPanesVariants } from './variants'

export type NavigatorContentProps = ComponentProps<'main'>

type RegisteredPane = { id: string; node: HTMLElement } & PaneRegistration

const SECTION_ROOT: DepthEntry = { role: 'list', kind: 'generated-section' }
const OPEN_MORE: DepthEntry = {
  role: 'list',
  kind: 'generated-overflow',
  current: true
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
    draws.rootList &&
    !drawn.some(
      (pane) => pane.kind === 'section' || pane.kind === 'generated-section'
    )
  const morePending =
    draws.moreOpen &&
    !drawn.some(
      (pane) => pane.kind === 'overflow' || pane.kind === 'generated-overflow'
    )
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

  // Panes slide only on a push or pop; a resize that changes the columns
  // cuts. Set in the commit that changes the stack, as the pane that changed
  // knows first; a transition, once started, outlives the attribute.
  const pushFrame = useRef(0)
  const markPushing = useCallback(() => {
    const row = rowRef.current
    if (!row) return
    row.setAttribute('data-pushing', '')
    cancelAnimationFrame(pushFrame.current)
    pushFrame.current = requestAnimationFrame(() => {
      pushFrame.current = requestAnimationFrame(() =>
        row.removeAttribute('data-pushing')
      )
    })
  }, [])
  useEffect(() => () => cancelAnimationFrame(pushFrame.current), [])

  // The Map serves effects, which run before the snapshot re-renders; render
  // reads the snapshot.
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

  // More's `current` follows `overflowOpen` so it is top in the commit it
  // opens, not one later.
  const ordered = useMemo(
    () =>
      orderByDocumentPosition(registered).map((pane) =>
        pane.kind === 'overflow' || pane.kind === 'generated-overflow'
          ? { ...pane, current: overflowOpen }
          : pane
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
        rank:
          pane.kind === 'overflow' || pane.kind === 'generated-overflow'
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

  // More and a change of section are tab switches, not pushes: the stack flips
  // without sliding. Keyed on `moreOpen`, not `overflowOpen`: a resize or
  // hydration mismatch can flip whether a More pane actually exists without
  // `overflowOpen` changing at all, and that still counts as a tab switch.
  // Declared after every `markPushing` call above, so it runs last this
  // commit and can cancel a push those calls marked for the same flip — a
  // pane mounting or unmounting as the section list gives way to More, or
  // back, is not a real push.
  const lastTab = useRef({ moreOpen, sectionValue })
  useInsertionEffect(() => {
    const last = lastTab.current
    if (last.moreOpen === moreOpen && last.sectionValue === sectionValue) {
      return
    }
    lastTab.current = { moreOpen, sectionValue }
    const row = rowRef.current
    if (row) {
      cancelAnimationFrame(pushFrame.current)
      row.removeAttribute('data-pushing')
    }
    const node = contentRef.current
    if (!node) return
    node.setAttribute('data-instant', '')
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => node.removeAttribute('data-instant'))
    })
    return () => cancelAnimationFrame(frame)
  }, [moreOpen, sectionValue])

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
  // stable, so these lookups can change with the stack without looping.
  const positionOf = useCallback(
    (id: string, entry: PaneRegistration) => {
      const index = stack.findIndex((pane) => pane.id === id)
      if (index === -1) return provisionalPosition(entry, revealRoot)
      // The snapshot learns of a `current` flip a commit late; the pane knows now.
      if (stack[index]?.current === entry.current) {
        return positions[index] ?? null
      }
      const flipped = stack.map((pane, at) =>
        at === index ? { ...pane, current: entry.current } : pane
      )
      return derivePositions(flipped, revealRoot)[index] ?? null
    },
    [stack, positions, revealRoot]
  )

  const depthOf = useCallback(
    (id: string, entry: PaneRegistration) => {
      const depth = depths.get(id)
      return depth === undefined ? provisionalDepth(entry) : depth
    },
    [depths]
  )

  const chromeOf = useCallback(
    (id: string, entry: PaneRegistration) => {
      const position = positionOf(id, entry)
      const top = position === 'top'
      if (
        sectionBack === null ||
        position === 'ahead' ||
        depthOf(id, entry) !== 1
      ) {
        return top ? topChrome : PANE_CHROME_NONE
      }
      return top ? sectionBack.top : sectionBack.below
    },
    [positionOf, depthOf, topChrome, sectionBack]
  )

  const isRootOf = useCallback(
    (id: string) => {
      const index = stack.findIndex((pane) => pane.id === id)
      return index !== -1 && index === rootIndex
    },
    [stack, rootIndex]
  )

  const stackValue = useMemo<PaneStackContextValue>(
    () => ({
      register,
      unregister,
      positionOf,
      chromeOf,
      isRootOf,
      depthOf,
      markPushing,
      moreOpen,
      level,
      destination: value
    }),
    [
      register,
      unregister,
      positionOf,
      chromeOf,
      isRootOf,
      depthOf,
      markPushing,
      moreOpen,
      level,
      value
    ]
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
    <GeneratedOverflowContext value key='__navigator-overflow'>
      <NavigatorOverflowPane>
        <PaneHeader>
          <PaneTitle>{OVERFLOW_LABEL}</PaneTitle>
        </PaneHeader>
        <NavigatorOverflowItems />
      </NavigatorOverflowPane>
    </GeneratedOverflowContext>
  ) : null

  // Keyed so the search resets with the section; More replaces it while open.
  const sectionPane = showsSectionPane ? (
    <NavigatorSectionPane key={activeSection.value} section={activeSection} />
  ) : null

  return (
    <main
      ref={ref}
      data-slot='navigator-content'
      className={cn(navigatorContentVariants(), className)}
      {...props}
    >
      <PaneStackContext value={stackValue}>
        {/* Resets to stack level so a nested Navigator registers its own panes. */}
        <PaneContext value={null}>
          <div
            ref={rowRef}
            data-slot='navigator-panes'
            data-level={level}
            data-reveal={revealing || moreOpen ? '' : undefined}
            data-overflow={moreOpen ? '' : undefined}
            className={navigatorPanesVariants()}
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
