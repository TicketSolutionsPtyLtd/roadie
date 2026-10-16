'use client'

import { type RefAttributes, useMemo } from 'react'

import { Toolbar as ToolbarPrimitive } from '@base-ui/react/toolbar'
import type { VariantProps } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { ScrollArea } from '../ScrollArea'
import { ToolbarContext, type ToolbarSize } from './ToolbarContext'
import { toolbarSurfaceVariants, toolbarVariants } from './variants'

export type ToolbarRootProps = Omit<ToolbarPrimitive.Root.Props, 'className'> &
  RefAttributes<HTMLDivElement> & {
    /** Classes for the toolbar's surface, its outermost element. */
    className?: string
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
    emphasis?: VariantProps<typeof toolbarSurfaceVariants>['emphasis']
  }

export function ToolbarRoot({
  className,
  size = 'md',
  emphasis,
  orientation = 'horizontal',
  ...props
}: ToolbarRootProps) {
  const contextValue = useMemo(() => ({ size }), [size])
  return (
    <ToolbarContext value={contextValue}>
      <ScrollArea
        data-slot='toolbar-surface'
        className={cn(toolbarSurfaceVariants({ emphasis }), className)}
      >
        {/* Arrow keys move focus, and focus scrolls itself into view. */}
        <ScrollArea.Viewport tabIndex={-1} fade='x'>
          {/* Base UI's inline fit-content would stop it wrapping. */}
          <ScrollArea.Content className='min-w-0!'>
            <ToolbarPrimitive.Root
              data-slot='toolbar'
              orientation={orientation}
              className={toolbarVariants({ orientation })}
              {...props}
            />
          </ScrollArea.Content>
        </ScrollArea.Viewport>
        {orientation === 'horizontal' && (
          <ScrollArea.Scrollbar orientation='horizontal'>
            <ScrollArea.Thumb />
          </ScrollArea.Scrollbar>
        )}
      </ScrollArea>
    </ToolbarContext>
  )
}

ToolbarRoot.displayName = 'Toolbar.Root'
