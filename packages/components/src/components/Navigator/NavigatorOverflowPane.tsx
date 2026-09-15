'use client'

import { use, useRef } from 'react'

import { mergeRefs } from '../../utils/mergeRefs'
import { useIsomorphicLayoutEffect } from '../../utils/useIsomorphicLayoutEffect'
import { PaneRoot, type PaneRootProps } from '../Pane/PaneRoot'
import { PaneKindContext } from '../Pane/PaneStackContext'
import { GeneratedOverflowContext } from './GeneratedOverflowContext'
import {
  NavigatorActionsContext,
  NavigatorDisclosureContext
} from './NavigatorContext'

export type NavigatorOverflowPaneProps = Omit<
  PaneRootProps,
  'role' | 'current' | 'depth' | 'primaryNav' | 'id'
>

/**
 * The More pane at every size: a pushed full-screen pane while stacked, the
 * root column otherwise. Omit it and `Navigator.Content` generates one
 * holding just the folded rows.
 */
export function NavigatorOverflowPane({
  className,
  children,
  ref: forwardedRef,
  ...props
}: NavigatorOverflowPaneProps) {
  const { overflowPaneId } = use(NavigatorActionsContext)
  const { overflowOpen } = use(NavigatorDisclosureContext)
  const generated = use(GeneratedOverflowContext)
  const paneRef = useRef<HTMLElement | null>(null)
  const ref = mergeRefs(paneRef, forwardedRef)
  const wasOpen = useRef(overflowOpen)

  useIsomorphicLayoutEffect(() => {
    const opened = overflowOpen && !wasOpen.current
    wasOpen.current = overflowOpen
    if (!opened || !paneRef.current) return
    // After the detail in the DOM, so a keyboard user would otherwise stay behind.
    const title = paneRef.current.querySelector<HTMLElement>(
      '[data-slot="pane-title"]'
    )
    const target = title ?? paneRef.current
    if (!target.hasAttribute('tabindex')) {
      target.tabIndex = -1
      target.addEventListener(
        'blur',
        () => target.removeAttribute('tabindex'),
        { once: true }
      )
    }
    target.focus({ preventScroll: true })
  }, [overflowOpen])

  return (
    <PaneKindContext value={generated ? 'generated-overflow' : 'overflow'}>
      <PaneRoot
        ref={ref}
        id={overflowPaneId}
        role='list'
        current={overflowOpen}
        primaryNav='visible'
        className={className}
        {...props}
      >
        {children}
      </PaneRoot>
    </PaneKindContext>
  )
}

NavigatorOverflowPane.displayName = 'Navigator.OverflowPane'
