'use client'

import { type RefAttributes, use } from 'react'

import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'

import { cn } from '@oztix/roadie-core/utils'

import { RoadieRoutedLink } from '../Link/RoadieRoutedLink'
import { TabsContext } from './TabsContext'
import { tabsTabVariants } from './variants'

/**
 * Smart-href props on Tabs.Tab. When `href` is set without an explicit
 * `render`, the component synthesizes
 * `render={<RoadieRoutedLink href={…} />}` and flips `nativeButton` to
 * false so Base UI treats the rendered anchor correctly. Consumer
 * `render` always wins.
 */
export interface TabsTabHrefProps {
  /**
   * Render the tab as a routed anchor instead of a `<button>`. Useful
   * for tabbed navigation where each tab maps to a route. Internal
   * hrefs route through `RoadieLinkProvider`.
   *
   * Note: pressing Enter on a focused link-tab triggers native browser
   * navigation immediately. For controlled `Tabs.value`, derive the
   * value from the route (e.g. `usePathname()`) rather than from
   * controlled local state — otherwise the active-tab indicator can
   * flicker between selection and route change.
   */
  href?: string
  /** Force external-link treatment when `href` is set. */
  external?: boolean
  /** Override the auto `target='_blank'` default on external hrefs. */
  target?: string
  /** Override the auto `rel='noopener noreferrer'` default on external hrefs. */
  rel?: string
}

export type TabsTabProps = TabsPrimitive.Tab.Props &
  RefAttributes<HTMLButtonElement> &
  TabsTabHrefProps

export function TabsTab({
  className,
  href,
  external,
  target,
  rel,
  ...props
}: TabsTabProps) {
  const { emphasis, size } = use(TabsContext)

  // Consumer `render` wins. Pair `href` + `render` warns once via Button
  // (not here — Tabs.Tab consumers are advanced; warn would be noise).
  const synthesizedRender =
    !props.render && href !== undefined ? (
      <RoadieRoutedLink
        href={href}
        external={external}
        target={target}
        rel={rel}
      />
    ) : undefined

  const finalRender = props.render ?? synthesizedRender

  return (
    <TabsPrimitive.Tab
      data-slot='tabs-tab'
      className={cn(tabsTabVariants({ emphasis, size }), className)}
      // Base UI defaults `nativeButton=true`; flip to false when the
      // rendered element isn't a `<button>` (anchor synthesis or
      // consumer-provided non-button render). Without this Base UI
      // emits a dev warning per node_modules/.../use-button/useButton.js.
      {...(finalRender !== undefined && { nativeButton: false })}
      {...props}
      render={finalRender}
    />
  )
}

TabsTab.displayName = 'Tabs.Tab'
