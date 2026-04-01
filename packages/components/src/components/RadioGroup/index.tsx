'use client'

import type { ComponentProps } from 'react'

import { Radio } from '@base-ui/react/radio'
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group'
import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

/* ─── Root variants ─── */

export const radioGroupVariants = cva('flex', {
  variants: {
    direction: {
      vertical: 'flex-col gap-2',
      horizontal: 'flex-row gap-4'
    }
  },
  defaultVariants: {
    direction: 'vertical'
  }
})

/* ─── Item variants ─── */

export const radioGroupItemVariants = cva(
  'flex cursor-pointer select-none items-center transition-all',
  {
    variants: {
      appearance: {
        default: 'gap-2 rounded-md px-1.5 py-1 emphasis-subtler is-interactive',
        card: 'justify-between gap-3 rounded-lg p-4 emphasis-default is-interactive has-[:checked]:bg-[var(--color-accent-2)] has-[:checked]:border-[var(--color-accent-9)] has-[:checked]:outline has-[:checked]:outline-[length:var(--focus-ring-width)] has-[:checked]:outline-[color-mix(in_oklch,var(--color-accent-9)_var(--focus-ring-opacity),transparent)] has-[:checked]:outline-offset-0'
      }
    },
    defaultVariants: {
      appearance: 'default'
    }
  }
)

/* ─── Root ─── */

export interface RadioGroupRootProps
  extends ComponentProps<typeof RadioGroupPrimitive>,
    VariantProps<typeof radioGroupVariants> {}

function RadioGroupRoot({
  className,
  direction,
  ...props
}: RadioGroupRootProps) {
  return (
    <RadioGroupPrimitive
      className={cn(radioGroupVariants({ direction, className }))}
      {...props}
    />
  )
}

RadioGroupRoot.displayName = 'RadioGroup'

/* ─── Item ─── */

export interface RadioGroupItemProps
  extends ComponentProps<typeof Radio.Root>,
    VariantProps<typeof radioGroupItemVariants> {
  label?: string
}

function RadioGroupItem({
  className,
  appearance,
  label,
  children,
  ...props
}: RadioGroupItemProps) {
  const radio = (
    <Radio.Root
      className='flex size-6 shrink-0 items-center justify-center rounded-full emphasis-sunken emphasis-subtle-border transition-all data-[checked]:bg-[var(--color-accent-3)] data-[checked]:border-[var(--color-accent-9)] outline-0 outline-[color-mix(in_oklch,var(--color-accent-9)_var(--focus-ring-opacity),transparent)] outline-offset-0 focus-visible:outline-[length:var(--focus-ring-width)]'
      {...props}
    >
      <Radio.Indicator className='size-2.5 rounded-full bg-[var(--color-accent-9)]' />
    </Radio.Root>
  )

  return (
    <label className={cn(radioGroupItemVariants({ appearance, className }))}>
      {appearance === 'card' ? (
        <>
          <div className='flex flex-col gap-0.5'>
            {label && (
              <span className='text-base font-medium emphasis-default-fg'>
                {label}
              </span>
            )}
            {children}
          </div>
          {radio}
        </>
      ) : (
        <>
          {radio}
          {label && (
            <span className='text-sm emphasis-default-fg'>{label}</span>
          )}
          {children}
        </>
      )}
    </label>
  )
}

RadioGroupItem.displayName = 'RadioGroup.Item'

/* ─── Compound export ─── */

export const RadioGroup = Object.assign(RadioGroupRoot, {
  Item: RadioGroupItem
})

export type RadioGroupProps = RadioGroupRootProps
