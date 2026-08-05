'use client'

import { use, useEffect } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { isDev } from '../../utils/isDev'
import { PaneRoot, type PaneRootProps } from '../Pane/PaneRoot'
import { PaneKindContext } from '../Pane/PaneStackContext'
import { GeneratedOverflowContext } from './GeneratedOverflowContext'
import { NavigatorContext } from './NavigatorContext'
import { navigatorOverflowVariants } from './variants'

export type NavigatorOverflowProps = Omit<
  PaneRootProps,
  'role' | 'presentation' | 'current' | 'primaryNav' | 'id'
>

/**
 * The mobile overflow, as a full-screen `Pane` at the top of the stack with
 * the tab bar still visible — a Menu tab, not a popup. Push/pop motion, the
 * depth pointer and the surface treatment all come from `Pane`.
 *
 * Declares like any other pane — registration finds it whether it's a direct
 * child of `Navigator.Content` or arrives through a wrapper. Omit it entirely
 * and Content generates one holding just the item list.
 *
 * Its `current` is the More tab's disclosure state, which lives on
 * `NavigatorContext` — the tab and this pane are different subtrees reading
 * one source.
 */
export function NavigatorOverflow({
  className,
  children,
  ...props
}: NavigatorOverflowProps) {
  const { overflowOpen, overflowPaneId } = use(NavigatorContext)
  const generated = use(GeneratedOverflowContext)

  // In an effect, not the render: two declared Navigator.Overflows both
  // carry `overflowPaneId`, so a mount-time DOM scan is the only way to
  // catch the duplicate — the id collision itself is invisible to render.
  useEffect(() => {
    if (!isDev() || typeof document === 'undefined') return
    const matches = document.querySelectorAll(`[id="${overflowPaneId}"]`).length
    if (matches > 1) {
      console.warn(
        `[Roadie] Navigator.Overflow: found ${matches} elements sharing ` +
          `id='${overflowPaneId}' — more than one Navigator.Overflow is ` +
          'declared under this Navigator. This produces a duplicate DOM id ' +
          'and a non-deterministic aria-controls target for the More tab. ' +
          'Declare at most one Navigator.Overflow, or omit it entirely and ' +
          'let Navigator.Content generate one.'
      )
    }
  }, [overflowPaneId])

  return (
    <PaneKindContext value={generated ? 'generated-overflow' : 'overflow'}>
      <PaneRoot
        id={overflowPaneId}
        role='detail'
        current={overflowOpen}
        // The bar stays full: the user is *in* the nav, not away from it.
        primaryNav='visible'
        className={cn(navigatorOverflowVariants(), className)}
        {...props}
      >
        {children}
      </PaneRoot>
    </PaneKindContext>
  )
}

NavigatorOverflow.displayName = 'Navigator.Overflow'
