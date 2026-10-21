'use client'

import { type ReactNode, type RefAttributes, use, useId } from 'react'

import { Radio } from '@base-ui/react/radio'

import { cn } from '@oztix/roadie-core/utils'

import { isEmptyNode } from '../../utils/isEmptyNode'
import { RadioGroupContext } from './RadioGroupContext'
import {
  radioGroupItemSizes,
  radioGroupItemTrailingClassName,
  radioGroupItemVariants
} from './variants'

export type RadioGroupItemProps = Radio.Root.Props &
  RefAttributes<HTMLButtonElement> & {
    label?: ReactNode
    description?: ReactNode
    /** End of the row: a count, `Badge`, or value. Left out of the accessible name. */
    trailing?: ReactNode
  }

export function RadioGroupItem({
  className,
  label,
  description,
  trailing,
  children,
  ...props
}: RadioGroupItemProps) {
  const { emphasis, direction, size } = use(RadioGroupContext)
  const sizes = radioGroupItemSizes[size]
  const generatedId = useId()
  const hasLabel = !isEmptyNode(label)
  const hasDescription = !isEmptyNode(description)
  const labelId = hasLabel ? `${generatedId}-label` : undefined
  const descriptionId = hasDescription
    ? `${generatedId}-description`
    : undefined

  const radio = (
    <Radio.Root
      className={cn(
        sizes.circle,
        'flex shrink-0 items-center justify-center rounded-full border border-subtle emphasis-sunken outline-0 outline-offset-0 outline-[color-mix(in_oklch,var(--color-accent-9)_var(--focus-ring-opacity),transparent)] transition-[background-color,border-color,outline-width,outline-color] duration-moderate data-[checked]:border-[var(--color-accent-9)] data-[checked]:bg-[var(--color-accent-3)]',
        emphasis !== 'normal' &&
          'focus-visible:outline-[length:var(--focus-ring-width)]'
      )}
      aria-labelledby={labelId}
      aria-describedby={descriptionId}
      {...props}
    >
      <Radio.Indicator
        className={cn(sizes.dot, 'rounded-full bg-[var(--color-accent-9)]')}
      />
    </Radio.Root>
  )

  const text = (hasLabel || hasDescription) && (
    <span className='grid min-w-0 gap-0.5 wrap-anywhere'>
      {hasLabel && (
        <span
          id={labelId}
          className={
            emphasis === 'normal'
              ? 'text-base font-medium text-normal'
              : cn(sizes.label, 'text-normal')
          }
        >
          {label}
        </span>
      )}
      {hasDescription && (
        <span id={descriptionId} className='text-sm text-subtle'>
          {description}
        </span>
      )}
    </span>
  )

  const trailingSlot = !isEmptyNode(trailing) && (
    <span
      data-slot='radio-group-item-trailing'
      className={radioGroupItemTrailingClassName}
    >
      {trailing}
    </span>
  )

  return (
    <label
      data-slot='radio-group-item'
      className={cn(
        radioGroupItemVariants({ emphasis, size, className }),
        direction === 'horizontal' && emphasis === 'normal' && 'flex-1'
      )}
    >
      {emphasis === 'normal' ? (
        <>
          <span className='flex items-center gap-2'>
            {children}
            {text}
          </span>
          {trailingSlot}
          {radio}
        </>
      ) : (
        <>
          {radio}
          {children}
          {text}
          {trailingSlot}
        </>
      )}
    </label>
  )
}

RadioGroupItem.displayName = 'RadioGroup.Item'
