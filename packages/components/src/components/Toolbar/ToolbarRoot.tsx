'use client'

import { type RefAttributes, useMemo } from 'react'

import { Toolbar as ToolbarPrimitive } from '@base-ui/react/toolbar'

import { cn } from '@oztix/roadie-core/utils'

import { ToolbarContext } from './ToolbarContext'

export type ToolbarRootProps = ToolbarPrimitive.Root.Props &
  RefAttributes<HTMLDivElement> & {
    /**
     * The size of the buttons and links the toolbar renders. A `render`
     * element keeps its own size.
     *
     * @default 'md'
     */
    size?: 'sm' | 'md' | 'lg'
  }

export function ToolbarRoot({
  className,
  size = 'md',
  ...props
}: ToolbarRootProps) {
  const contextValue = useMemo(() => ({ size }), [size])
  return (
    <ToolbarContext value={contextValue}>
      <ToolbarPrimitive.Root
        data-slot='toolbar'
        className={cn(
          'flex min-w-0 flex-wrap items-center gap-1',
          'data-[orientation=vertical]:w-fit data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch data-[orientation=vertical]:*:w-auto',
          className
        )}
        {...props}
      />
    </ToolbarContext>
  )
}

ToolbarRoot.displayName = 'Toolbar.Root'
