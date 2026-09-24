'use client'

import { type RefAttributes, useCallback, useMemo, useState } from 'react'

import { ToggleGroup as ToggleGroupPrimitive } from '@base-ui/react/toggle-group'

import { cn } from '@oztix/roadie-core/utils'

import { type RoadieIntent, intentVariants } from '../../variants'
import {
  ToggleGroupContext,
  type ToggleGroupContextValue
} from './ToggleGroupContext'
import { followPressedItem } from './followPressedItem'
import {
  type ToggleGroupDirection,
  type ToggleGroupSize,
  toggleGroupIndicatorVariants,
  toggleGroupVariants
} from './variants'

export type ToggleGroupRootProps<Value extends string = string> = Omit<
  ToggleGroupPrimitive.Props<Value>,
  'orientation'
> &
  RefAttributes<HTMLDivElement> & {
    /** Sets the colour palette. Inherits from the surrounding intent when unset. */
    intent?: RoadieIntent
    /**
     * Item size. The whole control matches the height of a Button of the
     * same size.
     *
     * @default 'md'
     */
    size?: ToggleGroupSize
    /**
     * Lays the items out in a row or a column. Arrow keys follow it.
     *
     * @default 'horizontal'
     */
    direction?: ToggleGroupDirection
  }

export function ToggleGroupRoot<Value extends string = string>({
  className,
  children,
  intent,
  size = 'md',
  direction = 'horizontal',
  multiple = false,
  onValueChange,
  ...props
}: ToggleGroupRootProps<Value>) {
  const [indicatorReady, setIndicatorReady] = useState(false)
  const followRef = useCallback(
    (indicator: HTMLSpanElement | null) =>
      indicator ? followPressedItem(indicator, setIndicatorReady) : undefined,
    []
  )
  const contextValue = useMemo<ToggleGroupContextValue>(
    () => ({ size, raisePressed: multiple || !indicatorReady }),
    [size, multiple, indicatorReady]
  )

  const handleValueChange: typeof onValueChange = (value, eventDetails) => {
    // A segmented control never ends up empty.
    if (!multiple && value.length === 0) {
      eventDetails.cancel()
      return
    }
    onValueChange?.(value, eventDetails)
  }

  return (
    <ToggleGroupContext value={contextValue}>
      <ToggleGroupPrimitive<Value>
        data-slot='toggle-group'
        orientation={direction}
        multiple={multiple}
        onValueChange={handleValueChange}
        className={cn(
          toggleGroupVariants(),
          intent && intentVariants[intent],
          className
        )}
        {...props}
      >
        {!multiple && (
          <span
            ref={followRef}
            aria-hidden
            data-slot='toggle-group-indicator'
            data-ready={indicatorReady ? '' : undefined}
            className={toggleGroupIndicatorVariants()}
          />
        )}
        {children}
      </ToggleGroupPrimitive>
    </ToggleGroupContext>
  )
}

ToggleGroupRoot.displayName = 'ToggleGroup.Root'
