'use client'

import { type ReactNode, type RefAttributes, use, useId } from 'react'

import { Radio } from '@base-ui/react/radio'

import { cn } from '@oztix/roadie-core/utils'

import { RadioGroupContext } from './RadioGroupContext'
import { radioGroupItemVariants } from './variants'

export type RadioGroupItemProps = Radio.Root.Props &
  RefAttributes<HTMLButtonElement> & {
    label?: ReactNode
    description?: ReactNode
  }

export function RadioGroupItem({
  className,
  label,
  description,
  children,
  ...props
}: RadioGroupItemProps) {
  const { emphasis, direction } = use(RadioGroupContext)
  const generatedId = useId()
  const labelId = label ? `${generatedId}-label` : undefined
  const descriptionId = description ? `${generatedId}-description` : undefined

  const radio = (
    <Radio.Root
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-full border border-subtle emphasis-sunken outline-0 outline-offset-0 outline-[color-mix(in_oklch,var(--color-accent-9)_var(--focus-ring-opacity),transparent)] transition-[background-color,border-color,outline-width,outline-color] duration-moderate data-[checked]:border-[var(--color-accent-9)] data-[checked]:bg-[var(--color-accent-3)]',
        emphasis !== 'normal' &&
          'focus-visible:outline-[length:var(--focus-ring-width)]'
      )}
      aria-labelledby={labelId}
      aria-describedby={descriptionId}
      {...props}
    >
      <Radio.Indicator className='size-2.5 rounded-full bg-[var(--color-accent-9)]' />
    </Radio.Root>
  )

  const text = (label || description) && (
    <span className='grid gap-0.5'>
      {label && (
        <span
          id={labelId}
          className={
            emphasis === 'normal'
              ? 'text-base font-medium text-normal'
              : 'text-sm text-normal'
          }
        >
          {label}
        </span>
      )}
      {description && (
        <span id={descriptionId} className='text-sm text-subtle'>
          {description}
        </span>
      )}
    </span>
  )

  return (
    <label
      data-slot='radio-group-item'
      className={cn(
        radioGroupItemVariants({ emphasis, className }),
        direction === 'horizontal' && emphasis === 'normal' && 'flex-1'
      )}
    >
      {emphasis === 'normal' ? (
        <>
          <span className='flex items-center gap-2'>
            {children}
            {text}
          </span>
          {radio}
        </>
      ) : (
        <>
          {radio}
          {children}
          {text}
        </>
      )}
    </label>
  )
}

RadioGroupItem.displayName = 'RadioGroup.Item'
