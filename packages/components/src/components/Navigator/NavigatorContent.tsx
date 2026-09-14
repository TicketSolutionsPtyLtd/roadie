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
import { PANE_MAX_DEPTH, PANE_MAX_LEVELS } from '../Pane/paneColumns'
import { GeneratedOverflowContext } from './GeneratedOverflowContext'
import {
  NavigatorActionsContext,
  NavigatorDisclosureContext,
  NavigatorSelectionContext,
  isActiveValue
} from './NavigatorContext'
import { NavigatorOverflowItems } from './NavigatorOverflowItems'
import { NavigatorOverflowPane } from './NavigatorOverflowPane'
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
import { useTopPaneChrome } from './useTopPaneChrome'
import { navigatorContentVariants, navigatorPanesVariants } from './variants'

export type NavigatorContentProps = ComponentProps<'main'>

type RegisteredPane = { id: string; node: HTMLElement } & PaneRegistration

const SECTION_ROOT: DepthEntry = { role: 'list', kind: 'generated-section' }

type Drawn = {
  /** The active section has a list, drawn or displaced by More. */
  rootList: boolean
  rootListDrawn: boolean
  sectionPane: boolean
  overflow: boolean
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
  const resolved = resolveDepths(rootPending ? [SECTION_ROOT, ...drawn] : drawn)
  const shift = rootPending ? 1 : 0
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

  // More and a change of section are tab switches, not pushes: the stack flips
  // without sliding. An insertion effect runs before any layout effect can
  // flush styles mid-flip.
  const sectionValue = activeSection?.value ?? null
  const lastTab = useRef({ overflowOpen, sectionValue })
  useInsertionEffect(() => {
    const last = lastTab.current
    if (
      last.overflowOpen === overflowOpen &&
      last.sectionValue === sectionValue
    ) {
      return
    }
    lastTab.current = { overflowOpen, sectionValue }
    const node = contentRef.current
    if (!node) return
    node.setAttribute('data-instant', '')
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => node.removeAttribute('data-instant'))
    })
    return () => cancelAnimationFrame(frame)
  }, [overflowOpen, sectionValue])

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

  const rootList = activeSection !== null && listPaneShows
  const rootListDrawn = rootList && !overflowOpen
  const showsSectionPane = rootListDrawn && !overridden
  const generatesOverflow =
    !declaredOverflow &&
    overflowItems.horizontal.length + overflowItems.vertical.length > 0

  const depths = useMemo(
    () =>
      depthsOf(ordered, {
        rootList,
        rootListDrawn,
        sectionPane: showsSectionPane,
        overflow: generatesOverflow
      }),
    [ordered, rootList, rootListDrawn, showsSectionPane, generatesOverflow]
  )

  const onSectionRoute =
    activeSection !== null && isActiveValue(activeSection.value, value)
  const revealing =
    listPaneShows && !overflowOpen && (onSectionRoute || showList)
  const positions = useMemo(
    () => derivePositions(ordered, revealing),
    [ordered, revealing]
  )
  const topIndex = positions.indexOf('top')
  const topId = topIndex === -1 ? null : (ordered[topIndex]?.id ?? null)
  const rootIndex = useMemo(() => deriveRootIndex(ordered), [ordered])

  // Unregistered, as on the server: a list pane is the root, top only while revealed.
  const atRoot =
    ordered.length === 0 ? revealing || !listPaneShows : topIndex === rootIndex
  const chrome = useTopPaneChrome({ atRoot })

  // Panes register through `register` and `unregister` alone, which stay
  // stable, so these lookups can change with the stack without looping.
  const positionOf = useCallback(
    (id: string, entry: PaneRegistration) => {
      const index = ordered.findIndex((pane) => pane.id === id)
      return index === -1
        ? provisionalPosition(entry, revealing)
        : (positions[index] ?? null)
    },
    [ordered, positions, revealing]
  )

  const depthOf = useCallback(
    (id: string, entry: PaneRegistration) => {
      const depth = depths.get(id)
      return depth === undefined ? provisionalDepth(entry) : depth
    },
    [depths]
  )

  const chromeOf = useCallback(
    (id: string, entry: PaneRegistration) =>
      positionOf(id, entry) === 'top' ? chrome : PANE_CHROME_NONE,
    [chrome, positionOf]
  )

  const isRootOf = useCallback(
    (id: string) => {
      const index = ordered.findIndex((pane) => pane.id === id)
      return index !== -1 && index === rootIndex
    },
    [ordered, rootIndex]
  )

  const stackValue = useMemo<PaneStackContextValue>(
    () => ({
      register,
      unregister,
      positionOf,
      chromeOf,
      isRootOf,
      depthOf,
      level
    }),
    [register, unregister, positionOf, chromeOf, isRootOf, depthOf, level]
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
    if (declared) return
    console.warn(
      '[Roadie] Navigator.Content rendered children but identified no ' +
        'panes. Stack position, push/pop motion and primaryNav are all ' +
        'inert until a Pane registers. If your panes render inside a ' +
        'wrapper that suppresses effects, or you are rendering a Pane ' +
        'from a server component, that is the cause.'
    )
  }, [hasChildren, registered])

  useEffect(() => {
    if (!isDev() || level < PANE_MAX_LEVELS) return
    console.warn(
      `[Roadie] Navigator.Content is nested ${level} deep; the pane columns stylesheet covers ${PANE_MAX_LEVELS} levels.`
    )
  }, [level])

  // The live Map, not `ordered`: a pane unmounting this commit is still in the render's snapshot.
  const warned = useRef(new Set<string>())
  useEffect(() => {
    if (!isDev()) return
    const live = orderByDocumentPosition(Array.from(panes.current.values()))
    const resolved = depthsOf(live, {
      rootList,
      rootListDrawn,
      sectionPane: showsSectionPane,
      overflow: generatesOverflow
    })
    const warnOnce = (message: string) => {
      if (warned.current.has(message)) return
      warned.current.add(message)
      console.warn(message)
    }
    for (const pane of live) {
      const depth = resolved.get(pane.id) ?? null
      const declared = provisionalDepth(pane)
      if (depth === null || declared === null) continue
      if (depth > PANE_MAX_DEPTH) {
        warnOnce(
          `[Roadie] A fifth stack pane (depth ${depth}) has no column. Flatten the navigation.`
        )
      } else if (depth > declared) {
        warnOnce(
          `[Roadie] A Pane declared or defaulted to depth ${declared} but sits at depth ${depth}. Declare depth={${depth}} so the server render matches.`
        )
      }
    }
  }, [registered, rootList, rootListDrawn, showsSectionPane, generatesOverflow])

  const topPrimaryNav =
    ordered.find((pane) => pane.id === topId)?.primaryNav ?? 'auto'
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
            data-slot='navigator-panes'
            data-level={level}
            data-reveal={revealing || overflowOpen ? '' : undefined}
            data-overflow={overflowOpen ? '' : undefined}
            className={navigatorPanesVariants()}
          >
            {sectionPane}
            {children}
            {fallbackOverflow}
          </div>
        </PaneContext>
      </PaneStackContext>
    </main>
  )
}

NavigatorContent.displayName = 'Navigator.Content'
