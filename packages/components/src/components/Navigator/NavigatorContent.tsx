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
import {
  type PaneRegistration,
  PaneStackContext,
  type PaneStackContextValue
} from '../Pane/PaneStackContext'
import { GeneratedOverflowContext } from './GeneratedOverflowContext'
import { NavigatorContext } from './NavigatorContext'
import { NavigatorOverflow } from './NavigatorOverflow'
import { NavigatorOverflowItems } from './NavigatorOverflowItems'
import { NavigatorPanelPane } from './NavigatorPanelPane'
import {
  derivePositions,
  deriveRootIndex,
  orderByDocumentPosition
} from './paneStack'
import { useTopPaneChrome } from './useTopPaneChrome'
import { navigatorContentVariants } from './variants'

export type NavigatorContentProps = ComponentProps<'main'>

type RegisteredPane = { id: string; node: HTMLElement } & PaneRegistration

/**
 * Arranges panes — Roadie's master–detail orchestrator.
 *
 * Owns exactly one derived value: which pane is the top of the stack. Whether
 * that matters is a CSS question, so there is no `matchMedia` here and no
 * breakpoint logic duplicated between JS and stylesheet.
 *
 * Panes announce themselves through `PaneStackContext` rather than being
 * found by walking `children` — a pane arriving inside a wrapper this
 * component did not render (a Next.js parallel-route slot node, most of all)
 * is invisible to a children walk but registers itself all the same.
 */
export function NavigatorContent({
  className,
  children,
  ...props
}: NavigatorContentProps) {
  const { setPrimaryNav, overflowItems, panelItems, openPanel } =
    use(NavigatorContext)
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

  // `version` is the ref's change signal — the Map itself is mutated in
  // place, so it can't be a dependency.
  const ordered = useMemo(
    () => orderByDocumentPosition(Array.from(panes.current.values())),
    [version]
  )
  // `positions` is the single definition of "who is top" — chrome and
  // `primaryNav` read through it rather than re-deriving their own index, so
  // an inspector-only stack (nowhere for a raw top-index to land but on a
  // pane `derivePositions` has already excluded) can't produce a second
  // answer that disagrees with the first.
  const positions = useMemo(() => derivePositions(ordered), [ordered])
  const topIndex = positions.indexOf('top')
  const topId = topIndex === -1 ? null : (ordered[topIndex]?.id ?? null)
  // Same derivation as `positions` — one definition of "root", read by
  // `isRootOf` below rather than a second walk over `ordered`.
  const rootIndex = useMemo(() => deriveRootIndex(ordered), [ordered])

  // Read through a ref, not a closure over `ordered`/`positions`/`topId`
  // directly: those are new arrays on every bump, and a `positionOf`/`chromeOf`
  // that changed identity on every registration would change `stackValue`,
  // which every mounted pane depends on to re-register — a registration
  // feeding back into itself, forever.
  // Writing a ref during render is only safe because it's read by another
  // component's render (`PaneRoot`) synchronously in the same commit, never
  // across a `await`/effect boundary. An abandoned concurrent render would
  // leave this holding values no committed tree produced.
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

  // `version` forces a new context value on every registration change, so a
  // pane sitting behind a bailed-out wrapper still gets scheduled to re-render
  // and read the ref's fresh contents — Context propagation reaches consumers
  // React would otherwise skip. `register`/`unregister`/`positionOf` are
  // themselves permanently stable; only `chromeOf` (via `chrome`) and
  // `version` ever change this object's identity.
  const stackValue = useMemo<PaneStackContextValue>(
    () => ({ register, unregister, positionOf, chromeOf, isRootOf }),
    [register, unregister, positionOf, chromeOf, isRootOf, version]
  )

  // `PANE_CHROME_NONE` is also the default a covered pane legitimately gets —
  // "never seen by the orchestrator" and "correctly behind another pane" are
  // otherwise indistinguishable, which is exactly how this bug stayed
  // invisible. `children != null` keeps a genuinely empty Content silent.
  //
  // Reads `panes.current` directly rather than the render-time `ordered`:
  // passive effects run children-before-parent within one commit, so a
  // mounting pane's own registration effect has already populated the ref by
  // the time this effect runs, even though `ordered` was still empty when
  // this render captured it. Checking `ordered.length` here would warn on
  // every first mount and then immediately contradict itself.
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

  // Only the top pane's declaration reaches the bar — one below it is talking
  // about a screen the user is no longer on. In an effect because the tab bar
  // is a sibling subtree, not a descendant.
  const topPrimaryNav =
    ordered.find((pane) => pane.id === topId)?.primaryNav ?? 'auto'
  useEffect(() => {
    setPrimaryNav(topPrimaryNav)
  }, [topPrimaryNav, setPrimaryNav])

  // Two signals, not one. The children scan is a synchronous fast path: it
  // catches the common, unwrapped case on the very first render, so a direct
  // `Navigator.Overflow` never flickers a generated pane in before correcting
  // itself. It can't see one behind a wrapper, which is what the
  // registration check is for — `kind` distinguishes a consumer's own
  // declaration (`'overflow'`) from the fallback's own registration
  // (`'generated-overflow'`), so the fallback never mistakes itself for a
  // declaration and toggles on and off forever. The registration check only
  // resolves after mount, so a wrapped declaration and the generated
  // fallback can share the DOM id for a single frame before the fallback's
  // effect cleans it up — both start closed, so nothing is visible in that
  // frame.
  const declaredOverflow =
    Children.toArray(children).some(
      (child) => isValidElement(child) && child.type === NavigatorOverflow
    ) || ordered.some((pane) => pane.kind === 'overflow')
  const fallbackOverflow =
    !declaredOverflow && overflowItems.length > 0 ? (
      <GeneratedOverflowContext value key='__navigator-overflow'>
        <NavigatorOverflow>
          <NavigatorOverflowItems />
        </NavigatorOverflow>
      </GeneratedOverflowContext>
    ) : null

  // The open panel's own pane — not portalled from the rail where it's
  // declared, but re-found here by value, the same seam the overflow
  // fallback above already reads through. Only the open one ever mounts.
  const openPanelSlot =
    openPanel === null
      ? null
      : (panelItems.find((slot) => slot.value === openPanel) ?? null)

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
          {openPanelSlot ? (
            <NavigatorPanelPane
              key={openPanelSlot.value}
              slot={openPanelSlot}
            />
          ) : null}
        </PaneContext>
      </PaneStackContext>
    </main>
  )
}

NavigatorContent.displayName = 'Navigator.Content'
