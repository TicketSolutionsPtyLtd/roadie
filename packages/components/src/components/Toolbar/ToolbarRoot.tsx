'use client'

import { type RefAttributes, useMemo } from 'react'

import { Toolbar as ToolbarPrimitive } from '@base-ui/react/toolbar'
import type { VariantProps } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { ToolbarContext, type ToolbarSize } from './ToolbarContext'
import { toolbarVariants } from './variants'

export type ToolbarRootProps = ToolbarPrimitive.Root.Props &
  RefAttributes<HTMLDivElement> & {
    /**
     * The size of the buttons and links the toolbar renders. A `render`
     * element keeps its own size.
     *
     * @default 'md'
     */
    size?: ToolbarSize
    /**
     * The surface behind the toolbar. `subtler` has none, for a toolbar
     * inside another surface. The buttons stay at `subtler` on every one.
     *
     * @default 'normal'
     */
    emphasis?: VariantProps<typeof toolbarVariants>['emphasis']
  }

export function ToolbarRoot({
  className,
  size = 'md',
  emphasis,
  ...props
}: ToolbarRootProps) {
  const contextValue = useMemo(() => ({ size }), [size])
  return (
    <ToolbarContext value={contextValue}>
      <ToolbarPrimitive.Root
        data-slot='toolbar'
        className={cn(toolbarVariants({ emphasis }), className)}
        {...props}
      />
    </ToolbarContext>
  )
}

ToolbarRoot.displayName = 'Toolbar.Root'
