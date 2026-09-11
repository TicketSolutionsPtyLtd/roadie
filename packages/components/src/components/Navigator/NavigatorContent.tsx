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
import { PaneBodyTitle } from '../Pane/PaneBodyTitle'
import { PANE_CHROME_NONE } from '../Pane/PaneChromeContext'
import { PaneContext } from '../Pane/PaneContext'
import { PaneHeader } from '../Pane/PaneHeader'
import {
  type PaneRegistration,
  PaneStackContext,
  type PaneStackContextValue
} from '../Pane/PaneStackContext'
import { GeneratedOverflowContext } from './GeneratedOverflowContext'
import { NavigatorContext } from './NavigatorContext'
import { NavigatorOverflow } from './NavigatorOverflow'
import { NavigatorOverflowItems } from './NavigatorOverflowItems'
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
  const { setPrimaryNav, overflowItems } = use(NavigatorContext)
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

  // The Map mutates in place, so `version` is its change signal.
  const ordered = useMemo(
    () => orderByDocumentPosition(Array.from(panes.current.values())),
    [version]
  )
  const positions = useMemo(() => derivePositions(ordered), [ordered])
  const topIndex = positions.indexOf('top')
  const topId = topIndex === -1 ? null : (ordered[topIndex]?.id ?? null)
  const rootIndex = useMemo(() => deriveRootIndex(ordered), [ordered])

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

  // `version` re-renders panes behind bailed-out wrappers so they read the ref afresh.
  const stackValue = useMemo<PaneStackContextValue>(
    () => ({ register, unregister, positionOf, chromeOf, isRootOf }),
    [register, unregister, positionOf, chromeOf, isRootOf, version]
  )

  // Reads the ref, not `ordered`: child effects have registered by now, the render hadn't.
  const hasChildren = children != null && children !== false
  useEffect(() => {
    if (!isDev() || !hasChildren || panes.current.size > 0) return
    console.warn(
      '[Roadie] Navigator.Content rendered children but identified no ' +
        'panes. Stack position, push/pop motion, the mobile section nav ' +
        'and primaryNav are all inert until a Pane registers. If your ' +
        'panes render inside a wrapper that suppresses effects, or you are ' +
        'rendering a Pane from a server component, that is the cause.'
    )
  }, [hasChildren, version])

  const topPrimaryNav =
    ordered.find((pane) => pane.id === topId)?.primaryNav ?? 'auto'
  useEffect(() => {
    setPrimaryNav(topPrimaryNav)
  }, [topPrimaryNav, setPrimaryNav])

  // The children scan avoids a first-render flicker; registration finds a wrapped declaration.
  const declaredOverflow =
    Children.toArray(children).some(
      (child) => isValidElement(child) && child.type === NavigatorOverflow
    ) || ordered.some((pane) => pane.kind === 'overflow')
  const fallbackOverflow =
    !declaredOverflow && overflowItems.length > 0 ? (
      <GeneratedOverflowContext value key='__navigator-overflow'>
        <NavigatorOverflow>
          <PaneHeader />
          <PaneBodyTitle className='pb-3'>{OVERFLOW_LABEL}</PaneBodyTitle>
          <NavigatorOverflowItems />
        </NavigatorOverflow>
      </GeneratedOverflowContext>
    ) : null

  return (
    <main
      data-slot='navigator-content'
      className={cn(navigatorContentVariants(), className)}
      {...props}
    >
      <PaneStackContext value={stackValue}>
        {/* Entering an orchestrator puts you back at stack level, even
            nested inside someone else's pane — otherwise a Navigator
            declared as pane content could never register its own panes. */}
        <PaneContext value={null}>
          {children}
          {fallbackOverflow}
        </PaneContext>
      </PaneStackContext>
    </main>
  )
}

NavigatorContent.displayName = 'Navigator.Content'
