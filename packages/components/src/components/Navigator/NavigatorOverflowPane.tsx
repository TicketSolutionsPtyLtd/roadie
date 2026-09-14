'use client'

import { use, useEffect, useRef } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { isDev } from '../../utils/isDev'
import { mergeRefs } from '../../utils/mergeRefs'
import { useIsomorphicLayoutEffect } from '../../utils/useIsomorphicLayoutEffect'
import { PaneRoot, type PaneRootProps } from '../Pane/PaneRoot'
import { PaneKindContext } from '../Pane/PaneStackContext'
import { GeneratedOverflowContext } from './GeneratedOverflowContext'
import {
  NavigatorActionsContext,
  NavigatorDisclosureContext
} from './NavigatorContext'
import { navigatorOverflowVariants } from './variants'

export type NavigatorOverflowPaneProps = Omit<
  PaneRootProps,
  'role' | 'presentation' | 'current' | 'depth' | 'primaryNav' | 'id'
>

/**
 * The More pane at every size: a pushed full-screen pane while stacked, the
 * leading list column from `lg`. Omit it and `Navigator.Content` generates
 * one holding just the folded rows.
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

  // A DOM scan: two declarations share `overflowPaneId`, which render can't see.
  useEffect(() => {
    if (!isDev() || typeof document === 'undefined') return
    const matches = document.querySelectorAll(`[id="${overflowPaneId}"]`).length
    if (matches > 1) {
      console.warn(
        `[Roadie] Navigator.OverflowPane: found ${matches} elements sharing ` +
          `id='${overflowPaneId}' — more than one Navigator.OverflowPane is ` +
          'declared under this Navigator. This produces a duplicate DOM id ' +
          'and a non-deterministic aria-controls target for the More tab. ' +
          'Declare at most one Navigator.OverflowPane, or omit it entirely ' +
          'and let Navigator.Content generate one.'
      )
    }
  }, [overflowPaneId])

  return (
    <PaneKindContext value={generated ? 'generated-overflow' : 'overflow'}>
      <PaneRoot
        ref={ref}
        id={overflowPaneId}
        role='list'
        current={overflowOpen}
        primaryNav='visible'
        className={cn(
          navigatorOverflowVariants({ open: overflowOpen }),
          className
        )}
        {...props}
      >
        {children}
      </PaneRoot>
    </PaneKindContext>
  )
}

NavigatorOverflowPane.displayName = 'Navigator.OverflowPane'
