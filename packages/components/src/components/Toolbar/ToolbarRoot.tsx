'use client'

import { type CSSProperties, type RefAttributes, useMemo } from 'react'

import { Toolbar as ToolbarPrimitive } from '@base-ui/react/toolbar'
import type { VariantProps } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { ScrollArea } from '../ScrollArea'
import { ToolbarContext, type ToolbarSize } from './ToolbarContext'
import { toolbarSurfaceVariants, toolbarVariants } from './variants'

export type ToolbarRootProps = Omit<
  ToolbarPrimitive.Root.Props,
  'className' | 'style'
> &
  RefAttributes<HTMLDivElement> & {
    /** Classes for the toolbar's surface, its outermost element. */
    className?: string
    /** Styles for the toolbar's surface, its outermost element. */
    style?: CSSProperties
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
  style,
  hidden,
  size = 'md',
  emphasis,
  orientation = 'horizontal',
  onFocus,
  ...props
}: ToolbarRootProps) {
  const contextValue = useMemo(() => ({ size }), [size])
  return (
    <ToolbarContext value={contextValue}>
      <ScrollArea
        data-slot='toolbar-surface'
        className={cn(toolbarSurfaceVariants({ emphasis }), className)}
        style={style}
        hidden={hidden}
      >
        <ScrollArea.Viewport
          tabIndex={-1}
          fade='x'
          className='scroll-px-(--scroll-area-fade-size)'
        >
          <ScrollArea.Content>
            <ToolbarPrimitive.Root
              data-slot='toolbar'
              orientation={orientation}
              className={toolbarVariants({ orientation })}
              // Base UI scrolls the toolbar, not this viewport, and a native
              // focus leaves a half-hidden item where it is. jsdom has no
              // scrollIntoView.
              onFocus={(event) => {
                event.target.scrollIntoView?.({
                  block: 'nearest',
                  inline: 'nearest'
                })
                onFocus?.(event)
              }}
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
