'use client'

import { type ComponentProps, createContext, use } from 'react'

import { Radio } from '@base-ui/react/radio'
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group'
import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

/* ─── Types ─── */

type RadioGroupEmphasis = 'subtler' | 'normal'

/* ─── Context ─── */

const RadioGroupContext = createContext<RadioGroupEmphasis>('subtler')

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
  'flex cursor-pointer select-none items-center',
  {
    variants: {
      emphasis: {
        subtler: 'gap-2 rounded-lg px-1.5 py-1 emphasis-subtler is-interactive',
        normal:
          'justify-between gap-3 rounded-xl p-4 emphasis-normal is-interactive has-[:checked]:bg-[var(--color-accent-2)] has-[:checked]:border-[var(--color-accent-9)] has-[:checked]:outline has-[:checked]:outline-[length:var(--focus-ring-width)] has-[:checked]:outline-[color-mix(in_oklch,var(--color-accent-9)_var(--focus-ring-opacity),transparent)] has-[:checked]:outline-offset-0'
      }
    },
    defaultVariants: {
      emphasis: 'subtler'
    }
  }
)

/* ─── Root ─── */

export interface RadioGroupRootProps
  extends ComponentProps<typeof RadioGroupPrimitive>,
    VariantProps<typeof radioGroupVariants> {
  emphasis?: RadioGroupEmphasis
}

function RadioGroupRoot({
  className,
  direction,
  emphasis = 'subtler',
  ...props
}: RadioGroupRootProps) {
  return (
    <RadioGroupContext value={emphasis}>
      <RadioGroupPrimitive
        className={cn(radioGroupVariants({ direction, className }))}
        {...props}
      />
    </RadioGroupContext>
  )
}

RadioGroupRoot.displayName = 'RadioGroup'

/* ─── Item ─── */

export interface RadioGroupItemProps extends ComponentProps<typeof Radio.Root> {
  label?: string
}

function RadioGroupItem({
  className,
  label,
  children,
  ...props
}: RadioGroupItemProps) {
  const emphasis = use(RadioGroupContext)

  const radio = (
    <Radio.Root
      className='duration-moderate flex size-6 shrink-0 items-center justify-center rounded-full border border-subtle emphasis-sunken outline-0 outline-offset-0 outline-[color-mix(in_oklch,var(--color-accent-9)_var(--focus-ring-opacity),transparent)] transition-[background-color,border-color,outline-width,outline-color] focus-visible:outline-[length:var(--focus-ring-width)] data-[checked]:border-[var(--color-accent-9)] data-[checked]:bg-[var(--color-accent-3)]'
      {...props}
    >
      <Radio.Indicator className='size-2.5 rounded-full bg-[var(--color-accent-9)]' />
    </Radio.Root>
  )

  return (
    <label className={cn(radioGroupItemVariants({ emphasis, className }))}>
      {emphasis === 'normal' ? (
        <>
          <div className='grid gap-0.5'>
            {label && (
              <span className='text-base font-medium text-normal'>{label}</span>
            )}
            {children}
          </div>
          {radio}
        </>
      ) : (
        <>
          {radio}
          {label && <span className='text-sm text-normal'>{label}</span>}
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
