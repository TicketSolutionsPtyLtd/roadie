'use client'

import {
  Children,
  type ComponentProps,
  isValidElement,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { isDev } from '../../utils/isDev'
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
import { NavigatorContext, isActiveValue } from './NavigatorContext'
import { NavigatorOverflowItems } from './NavigatorOverflowItems'
import { NavigatorOverflowPane } from './NavigatorOverflowPane'
import { NavigatorSecondaryPane } from './NavigatorSecondaryPane'
import { NavigatorSectionPane } from './NavigatorSectionPane'
import { OVERFLOW_LABEL } from './mobileSlots'
import {
  derivePositions,
  deriveRootIndex,
  orderByDocumentPosition
} from './paneStack'
import { useTopPaneChrome } from './useTopPaneChrome'
import { navigatorContentVariants } from './variants'

export type NavigatorContentProps = ComponentProps<'main'>

type RegisteredPane = { id: string; node: HTMLElement } & PaneRegistration

/** Arranges panes and decides which is the top of the stack. */
export function NavigatorContent({
  className,
  children,
  ...props
}: NavigatorContentProps) {
  const {
    value,
    setPrimaryNav,
    overflowItems,
    overflowOpen,
    activeSection,
    declaredSecondaryPanes,
    showList,
    setStackAtRoot
  } = use(NavigatorContext)
  const chrome = useTopPaneChrome()

  const panes = useRef(new Map<string, RegisteredPane>())
  const [version, bump] = useState(0)

  const register = useCallback(
    (id: string, node: HTMLElement, entry: PaneRegistration) => {
      panes.current.set(id, { id, node, ...entry })
      bump((n) => n + 1)
    },
    []
  )

  const unregister = useCallback((id: string) => {
    panes.current.delete(id)
    bump((n) => n + 1)
  }, [])

  // The Map mutates in place, so `version` is its change signal. More's
  // `current` is read live so it is top in the commit it opens, not one later.
  const ordered = useMemo(
    () =>
      orderByDocumentPosition(Array.from(panes.current.values())).map((pane) =>
        pane.kind === 'overflow' || pane.kind === 'generated-overflow'
          ? { ...pane, current: overflowOpen }
          : pane
      ),
    [version, overflowOpen]
  )
  const onSectionRoute =
    activeSection !== null && isActiveValue(activeSection.value, value)
  const revealing =
    activeSection !== null && !overflowOpen && (onSectionRoute || showList)
  const positions = useMemo(
    () => derivePositions(ordered, revealing),
    [ordered, revealing]
  )
  const topIndex = positions.indexOf('top')
  const topId = topIndex === -1 ? null : (ordered[topIndex]?.id ?? null)
  const rootIndex = useMemo(() => deriveRootIndex(ordered), [ordered])

  const atRoot = topIndex === rootIndex
  useEffect(() => {
    setStackAtRoot(atRoot)
  }, [atRoot, setStackAtRoot])

  // A ref keeps the lookups stable; closing over fresh arrays would loop pane registration.
  const latest = useRef({ ordered, positions, topId, rootIndex })
  latest.current = { ordered, positions, topId, rootIndex }

  const positionOf = useCallback((id: string) => {
    const { ordered, positions } = latest.current
    const index = ordered.findIndex((pane) => pane.id === id)
    return index === -1 ? null : (positions[index] ?? null)
  }, [])

  const chromeOf = useCallback(
    (id: string) => (id === latest.current.topId ? chrome : PANE_CHROME_NONE),
    [chrome]
  )

  const isRootOf = useCallback((id: string) => {
    const { ordered, rootIndex } = latest.current
    const index = ordered.findIndex((pane) => pane.id === id)
    return index !== -1 && index === rootIndex
  }, [])

  // `version` and `overflowOpen` re-render panes behind bailed-out wrappers so they read the ref afresh.
  const stackValue = useMemo<PaneStackContextValue>(
    () => ({ register, unregister, positionOf, chromeOf, isRootOf }),
    [
      register,
      unregister,
      positionOf,
      chromeOf,
      isRootOf,
      version,
      overflowOpen
    ]
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

  // Reads the ref, not `ordered`: child effects have registered by now, the render hadn't.
  const hasChildren = children != null && children !== false
  useEffect(() => {
    if (!isDev() || !hasChildren) return
    const declared = Array.from(panes.current.values()).some(
      (pane) => pane.kind === 'pane' || pane.kind === 'overflow'
    )
    if (declared) return
    console.warn(
      '[Roadie] Navigator.Content rendered children but identified no ' +
        'panes. Stack position, push/pop motion and primaryNav are all ' +
        'inert until a Pane registers. If your panes render inside a ' +
        'wrapper that suppresses effects, or you are rendering a Pane ' +
        'from a server component, that is the cause.'
    )
  }, [hasChildren, version])

  const topPrimaryNav =
    ordered.find((pane) => pane.id === topId)?.primaryNav ?? 'auto'
  useEffect(() => {
    setPrimaryNav(topPrimaryNav)
  }, [topPrimaryNav, setPrimaryNav])

  const fallbackOverflow =
    !declaredOverflow &&
    overflowItems.horizontal.length + overflowItems.vertical.length > 0 ? (
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
  const sectionPane =
    activeSection !== null && !overflowOpen && !overridden ? (
      <NavigatorSectionPane key={activeSection.value} section={activeSection} />
    ) : null

  return (
    <main
      data-slot='navigator-content'
      className={cn(navigatorContentVariants(), className)}
      {...props}
    >
      <PaneStackContext value={stackValue}>
        {/* Resets to stack level so a nested Navigator registers its own panes. */}
        <PaneContext value={null}>
          {sectionPane}
          {children}
          {fallbackOverflow}
        </PaneContext>
      </PaneStackContext>
    </main>
  )
}

NavigatorContent.displayName = 'Navigator.Content'
