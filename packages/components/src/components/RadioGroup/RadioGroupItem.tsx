'use client'

import { type RefAttributes, use } from 'react'

import { Radio } from '@base-ui/react/radio'

import { cn } from '@oztix/roadie-core/utils'

import { RadioGroupContext } from './RadioGroupContext'
import { radioGroupItemVariants } from './variants'

export type RadioGroupItemProps = Radio.Root.Props &
  RefAttributes<HTMLButtonElement> & {
    label?: string
    description?: string
  }

export function RadioGroupItem({
  className,
  label,
  description,
  children,
  ...props
}: RadioGroupItemProps) {
  const { emphasis, direction } = use(RadioGroupContext)

  const radio = (
    <Radio.Root
      className={cn(
        'duration-moderate flex size-6 shrink-0 items-center justify-center rounded-full border border-subtle emphasis-sunken outline-0 outline-offset-0 outline-[color-mix(in_oklch,var(--color-accent-9)_var(--focus-ring-opacity),transparent)] transition-[background-color,border-color,outline-width,outline-color] data-[checked]:border-[var(--color-accent-9)] data-[checked]:bg-[var(--color-accent-3)]',
        emphasis !== 'normal' &&
          'focus-visible:outline-[length:var(--focus-ring-width)]'
      )}
      {...props}
    >
      <Radio.Indicator className='size-2.5 rounded-full bg-[var(--color-accent-9)]' />
    </Radio.Root>
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
          <div className='grid gap-0.5'>
            <span className='flex items-center gap-2'>
              {children}
              {label && (
                <span className='text-base font-medium text-normal'>
                  {label}
                </span>
              )}
            </span>
            {description && (
              <span className='text-sm text-subtle'>{description}</span>
            )}
          </div>
          {radio}
        </>
      ) : (
        <>
          {radio}
          {children}
          {label && <span className='text-sm text-normal'>{label}</span>}
        </>
      )}
    </label>
  )
}

RadioGroupItem.displayName = 'RadioGroup.Item'
