'use client'

import {
  type RefAttributes,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import { ToggleGroup as ToggleGroupPrimitive } from '@base-ui/react/toggle-group'

import { cn } from '@oztix/roadie-core/utils'

import { type RoadieIntent, intentVariants } from '../../variants'
import {
  ToggleGroupContext,
  type ToggleGroupContextValue
} from './ToggleGroupContext'
import { PRESSED_ITEM, followPressedItem } from './followPressedItem'
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
     * The track at rest, as on Toggle. `normal` is bordered and `subtle` is
     * tinted, each with a solid pressed pill. `subtler` has no track and a
     * soft pill and a strong
     * label.
     *
     * @default 'normal'
     */
    emphasis?: 'normal' | 'subtle' | 'subtler'
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
  emphasis = 'normal',
  direction = 'horizontal',
  multiple = false,
  onValueChange,
  onFocus,
  onBlur,
  onPointerDown,
  onClick,
  ...props
}: ToggleGroupRootProps<Value>) {
  const [indicatorReady, setIndicatorReady] = useState(false)
  const followRef = useCallback(
    (indicator: HTMLSpanElement | null) =>
      indicator ? followPressedItem(indicator, setIndicatorReady) : undefined,
    []
  )
  const contextValue = useMemo<ToggleGroupContextValue>(
    () => ({ size, emphasis, raisePressed: multiple || !indicatorReady }),
    [size, emphasis, multiple, indicatorReady]
  )

  const handleValueChange: typeof onValueChange = (value, eventDetails) => {
    // A segmented control never ends up empty.
    if (!multiple && value.length === 0) {
      eventDetails.cancel()
      return
    }
    onValueChange?.(value, eventDetails)
  }

  // Keyboard entry lands on the pressed item, as in a radio group. A pointer
  // focuses what it presses; the flag lasts until that focus or the click.
  // A window blur leaves its item active, and the window coming back refocuses
  // it with no relatedTarget, so that focus is a return, not an entry. Focus
  // landing outside the group first cancels the return.
  const pointerActive = useRef(false)
  const windowBlurred = useRef(false)
  const stopWatchingReturn = useRef<(() => void) | null>(null)
  useEffect(() => () => stopWatchingReturn.current?.(), [])
  const handleFocus: typeof onFocus = (event) => {
    onFocus?.(event)
    const byPointer = pointerActive.current
    const returning = windowBlurred.current
    pointerActive.current = false
    windowBlurred.current = false
    const group = event.currentTarget
    if (multiple || byPointer || returning) return
    if (group.contains(event.relatedTarget as Node | null)) return
    const pressed = group.querySelector<HTMLElement>(PRESSED_ITEM)
    if (pressed && pressed !== event.target) pressed.focus()
  }
  const handleBlur: typeof onBlur = (event) => {
    onBlur?.(event)
    const group = event.currentTarget
    const doc = group.ownerDocument
    stopWatchingReturn.current?.()
    windowBlurred.current =
      event.relatedTarget === null && event.target === doc.activeElement
    if (!windowBlurred.current) return
    const watchReturn = (focus: FocusEvent) => {
      stop()
      if (!(focus.target instanceof Node && group.contains(focus.target)))
        windowBlurred.current = false
    }
    const stop = () => {
      doc.removeEventListener('focusin', watchReturn, true)
      stopWatchingReturn.current = null
    }
    doc.addEventListener('focusin', watchReturn, true)
    stopWatchingReturn.current = stop
  }
  const handlePointerDown: typeof onPointerDown = (event) => {
    onPointerDown?.(event)
    pointerActive.current = true
  }
  const handleClick: typeof onClick = (event) => {
    onClick?.(event)
    pointerActive.current = false
  }

  return (
    <ToggleGroupContext value={contextValue}>
      <ToggleGroupPrimitive<Value>
        data-slot='toggle-group'
        orientation={direction}
        multiple={multiple}
        onValueChange={handleValueChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onPointerDown={handlePointerDown}
        onClick={handleClick}
        className={cn(
          toggleGroupVariants({ emphasis }),
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
            className={toggleGroupIndicatorVariants({ emphasis })}
          />
        )}
        {children}
      </ToggleGroupPrimitive>
    </ToggleGroupContext>
  )
}

ToggleGroupRoot.displayName = 'ToggleGroup.Root'
