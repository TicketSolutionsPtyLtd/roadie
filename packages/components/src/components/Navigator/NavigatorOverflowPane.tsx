'use client'

import { use, useRef } from 'react'

import { mergeRefs } from '../../utils/mergeRefs'
import { useIsomorphicLayoutEffect } from '../../utils/useIsomorphicLayoutEffect'
import { PaneRoot, type PaneRootProps } from '../Pane/PaneRoot'
import { PaneKindContext } from '../Pane/PaneStackContext'
import {
  NavigatorActionsContext,
  NavigatorDisclosureContext
} from './NavigatorContext'

export type NavigatorOverflowPaneProps = Omit<
  PaneRootProps,
  'column' | 'reached' | 'depth' | 'tabBar' | 'id'
>

/** The More pane a Navigator generates. Internal: re-export it to let apps declare their own. */
export function NavigatorOverflowPane({
  className,
  children,
  ref: forwardedRef,
  ...props
}: NavigatorOverflowPaneProps) {
  const { overflowPaneId } = use(NavigatorActionsContext)
  const { overflowOpen } = use(NavigatorDisclosureContext)
  const generated = use(PaneKindContext) === 'generated-overflow'
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
        column='list'
        reached={overflowOpen}
        tabBar='visible'
        className={className}
        {...props}
      >
        {children}
      </PaneRoot>
    </PaneKindContext>
  )
}

NavigatorOverflowPane.displayName = 'NavigatorOverflowPane'
