'use client'

import { type RefAttributes, use, useCallback, useMemo, useState } from 'react'

import { ToggleGroup as ToggleGroupPrimitive } from '@base-ui/react/toggle-group'

import { cn } from '@oztix/roadie-core/utils'

import { followPressedItem } from '../ToggleGroup/followPressedItem'
import { ToolbarContext, ToolbarToggleGroupContext } from './ToolbarContext'

// The toolbar sets both: its orientation, and focus that loops across all its items.
export type ToolbarToggleGroupProps = Omit<
  ToggleGroupPrimitive.Props,
  'orientation' | 'loopFocus'
> &
  RefAttributes<HTMLDivElement>

// By place, not slot: a Tooltip.Trigger around a toggle sets its own slot.
const PRESSED_TOGGLE = ':scope > [data-pressed]'

/**
 * Toolbar toggles that share one value. With one pressed at a time, its fill
 * slides between them, as in `ToggleGroup`; with `multiple`, each fills itself.
 */
export function ToolbarToggleGroup({
  className,
  disabled = false,
  multiple = false,
  children,
  ...props
}: ToolbarToggleGroupProps) {
  const toolbar = use(ToolbarContext)
  const [indicatorReady, setIndicatorReady] = useState(false)
  const followRef = useCallback(
    (indicator: HTMLSpanElement | null) =>
      indicator
        ? followPressedItem(indicator, setIndicatorReady, PRESSED_TOGGLE)
        : undefined,
    []
  )
  const contextValue = useMemo(
    () => ({ disabled, sliding: !multiple && indicatorReady }),
    [disabled, multiple, indicatorReady]
  )
  return (
    <ToolbarToggleGroupContext value={contextValue}>
      <ToggleGroupPrimitive
        data-slot='toolbar-toggle-group'
        // Inside a toolbar, Base UI leaves it horizontal whatever the toolbar's orientation.
        orientation={toolbar.orientation}
        className={cn(
          'group/toolbar-toggle-group relative flex flex-wrap items-center gap-1',
          // Toggles only: the indicator takes the pressed toggle's width.
          'data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch data-[orientation=vertical]:*:not-data-[slot=toolbar-toggle-group-indicator]:w-auto',
          className
        )}
        disabled={disabled}
        multiple={multiple}
        {...props}
      >
        {!multiple && (
          // Hidden until measured, so it never slides in from the corner.
          <span
            ref={followRef}
            aria-hidden
            data-slot='toolbar-toggle-group-indicator'
            data-ready={indicatorReady ? '' : undefined}
            className={cn(
              'pointer-events-none absolute z-0 hidden rounded-full data-[ready]:block',
              'top-(--pressed-item-top) left-(--pressed-item-left) h-(--pressed-item-height) w-(--pressed-item-width)',
              'emphasis-subtle is-selected group-data-[disabled]/toolbar-toggle-group:opacity-50',
              'transition-[left,top,width,height] duration-slow ease-enter'
            )}
          />
        )}
        {children}
      </ToggleGroupPrimitive>
    </ToolbarToggleGroupContext>
  )
}

ToolbarToggleGroup.displayName = 'Toolbar.ToggleGroup'
