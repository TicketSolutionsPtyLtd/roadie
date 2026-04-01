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
        default: 'gap-2',
        card: 'gap-3 rounded-lg emphasis-default-surface emphasis-subtle-border p-3 hover:emphasis-subtle-surface has-[:checked]:emphasis-subtle-surface has-[:checked]:emphasis-default-border'
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
  return (
    <label className={cn(radioGroupItemVariants({ appearance, className }))}>
      <Radio.Root
        className='flex size-4 shrink-0 items-center justify-center rounded-full border border-[var(--intent-border-default)] transition-all data-[checked]:border-[var(--intent-9)] data-[checked]:bg-[var(--intent-9)] outline-none focus-visible:outline-4 focus-visible:outline-[color-mix(in_oklch,var(--intent-9)_30%,transparent)]'
        {...props}
      >
        <Radio.Indicator className='size-1.5 rounded-full bg-white' />
      </Radio.Root>
      {label && <span className='text-sm emphasis-default-fg'>{label}</span>}
      {children}
    </label>
  )
}

RadioGroupItem.displayName = 'RadioGroup.Item'

/* ─── Compound export ─── */

export const RadioGroup = Object.assign(RadioGroupRoot, {
  Item: RadioGroupItem
})

export type RadioGroupProps = RadioGroupRootProps
