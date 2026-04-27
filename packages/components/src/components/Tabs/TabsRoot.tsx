'use client'

import { type RefAttributes, useMemo } from 'react'

import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'

import { cn } from '@oztix/roadie-core/utils'

import { intentVariants } from '../../variants'
import { TabsContext, type TabsContextValue } from './TabsContext'
import {
  type TabsRootDirection,
  type TabsRootEmphasis,
  type TabsRootIntent,
  type TabsRootSize
} from './variants'

// Roadie standardises on `direction` for layout flow across compounds
// (matches `Carousel.Root`'s `direction` prop). Internally translates
// to Base UI's native `orientation` prop, which is what drives
// `data-[orientation=*]` on the rendered DOM.
export type TabsRootProps = Omit<TabsPrimitive.Root.Props, 'orientation'> &
  RefAttributes<HTMLDivElement> & {
    /**
     * Sets the intent cascade for descendant tabs.
     */
    intent?: TabsRootIntent
    /**
     * Visual treatment for the list and indicator. See the emphasis
     * ladder comment in `variants.ts` for the full description of
     * each option.
     *
     * @default 'normal'
     */
    emphasis?: TabsRootEmphasis
    /**
     * Tab height and typography size.
     *
     * @default 'md'
     */
    size?: TabsRootSize
    /**
     * Layout flow direction. `vertical` stacks the tabs in a column.
     * The active indicator follows the axis: in `subtler` emphasis
     * the underline becomes a left-edge bar, while the pill emphases
     * (`strong` / `normal` / `subtle`) keep their full-rect shape
     * around the active tab.
     *
     * @default 'horizontal'
     */
    direction?: TabsRootDirection
  }

export function TabsRoot({
  className,
  intent,
  emphasis = 'normal',
  size = 'md',
  direction = 'horizontal',
  ...props
}: TabsRootProps) {
  const contextValue = useMemo<TabsContextValue>(
    () => ({ emphasis, size }),
    [emphasis, size]
  )
  return (
    <TabsContext value={contextValue}>
      <TabsPrimitive.Root
        data-slot='tabs'
        orientation={direction}
        className={cn(intent && intentVariants[intent], className)}
        {...props}
      />
    </TabsContext>
  )
}

TabsRoot.displayName = 'Tabs.Root'
