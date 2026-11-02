'use client'

import { type CSSProperties, type RefAttributes, useMemo } from 'react'

import { Toolbar as ToolbarPrimitive } from '@base-ui/react/toolbar'

import { cn } from '@oztix/roadie-core/utils'

import { ScrollArea } from '../ScrollArea'
import {
  ToolbarContext,
  type ToolbarEmphasis,
  type ToolbarSize
} from './ToolbarContext'
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
    emphasis?: ToolbarEmphasis
    /**
     * Drops the border, shadow and pill shape, for a bar docked along an
     * edge. `emphasis` sets only its fill, and the parent draws any edge
     * and clips the corners. The controls keep their inset.
     *
     * @default false
     */
    flush?: boolean
  }

// Sideways only, within the row: scrollIntoView would scroll the page too.
function scrollRowTo(item: HTMLElement) {
  const viewport = item.closest<HTMLElement>(
    '[data-slot="scroll-area-viewport"]'
  )
  if (!viewport) return
  const { left, right } = item.getBoundingClientRect()
  const box = viewport.getBoundingClientRect()
  const padding = getComputedStyle(viewport)
  const start = box.left + parseFloat(padding.scrollPaddingLeft)
  const end = box.right - parseFloat(padding.scrollPaddingRight)
  if (left < start) viewport.scrollLeft -= start - left
  else if (right > end) viewport.scrollLeft += right - end
}

export function ToolbarRoot({
  className,
  style,
  hidden,
  size = 'md',
  emphasis,
  flush = false,
  orientation = 'horizontal',
  onFocus,
  ...props
}: ToolbarRootProps) {
  const contextValue = useMemo(
    () => ({ size, orientation }),
    [size, orientation]
  )
  return (
    <ToolbarContext value={contextValue}>
      <ScrollArea
        data-slot='toolbar-surface'
        className={cn(toolbarSurfaceVariants({ emphasis, flush }), className)}
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
              // focus leaves a half-hidden item where it is.
              onFocus={(event) => {
                scrollRowTo(event.target)
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
