'use client'

import type { ComponentProps } from 'react'

import { Select as SelectPrimitive } from '@base-ui/react/select'
import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

/* ─── Trigger variants (matches Input) ─── */

export const selectTriggerVariants = cva(
  'inline-flex w-full items-center justify-between rounded-md font-sans select-none cursor-pointer',
  {
    variants: {
      intent: {
        neutral: 'intent-neutral',
        brand: 'intent-brand',
        accent: 'intent-accent',
        danger: 'intent-danger',
        success: 'intent-success',
        warning: 'intent-warning',
        info: 'intent-info'
      },
      emphasis: {
        default: 'emphasis-raised border border-default is-field-interactive',
        subtle:
          'bg-subtle text-default border border-transparent is-field-interactive'
      },
      size: {
        sm: 'h-8 px-1.5 text-base',
        md: 'h-10 px-2 text-base',
        lg: 'h-12 px-2 text-base'
      }
    },
    defaultVariants: {
      intent: 'neutral',
      emphasis: 'default',
      size: 'md'
    }
  }
)

/* ─── Root ─── */

export interface SelectRootProps
  extends ComponentProps<typeof SelectPrimitive.Root> {}

function SelectRoot(props: SelectRootProps) {
  return <SelectPrimitive.Root {...props} />
}

SelectRoot.displayName = 'Select'

/* ─── Trigger ─── */

export interface SelectTriggerProps
  extends ComponentProps<typeof SelectPrimitive.Trigger>,
    VariantProps<typeof selectTriggerVariants> {}

function SelectTrigger({
  className,
  intent,
  emphasis,
  size,
  children: _children,
  ...props
}: SelectTriggerProps) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        selectTriggerVariants({ intent, emphasis, size, className })
      )}
      {...props}
    >
      <SelectPrimitive.Value />
      <SelectPrimitive.Icon className='ml-2 shrink-0'>
        <svg
          width='12'
          height='12'
          viewBox='0 0 12 12'
          fill='none'
          aria-hidden='true'
        >
          <path
            d='M3 4.5L6 7.5L9 4.5'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        </svg>
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

SelectTrigger.displayName = 'Select.Trigger'

/* ─── Popup (dropdown content) ─── */

export interface SelectPopupProps
  extends ComponentProps<typeof SelectPrimitive.Popup> {}

function SelectPopup({ className, ...props }: SelectPopupProps) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner>
        <SelectPrimitive.Popup
          className={cn(
            'intent-neutral bg-raised rounded-lg border border-[var(--intent-border-subtle)] py-1 z-50',
            className
          )}
          {...props}
        />
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

SelectPopup.displayName = 'Select.Popup'

/* ─── Item ─── */

export interface SelectItemProps
  extends ComponentProps<typeof SelectPrimitive.Item> {}

function SelectItem({ className, children, ...props }: SelectItemProps) {
  return (
    <SelectPrimitive.Item
      className={cn(
        'flex cursor-pointer select-none items-center px-3 py-1.5 text-sm text-default outline-none hover:bg-subtle data-[highlighted]:bg-subtle',
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

SelectItem.displayName = 'Select.Item'

/* ─── Label ─── */

export interface SelectLabelProps
  extends ComponentProps<typeof SelectPrimitive.Label> {}

function SelectLabel({ className, ...props }: SelectLabelProps) {
  return (
    <SelectPrimitive.Label
      className={cn('text-sm font-medium text-default', className)}
      {...props}
    />
  )
}

SelectLabel.displayName = 'Select.Label'

/* ─── Compound export ─── */

export const Select = Object.assign(SelectRoot, {
  Trigger: SelectTrigger,
  Popup: SelectPopup,
  Item: SelectItem,
  Label: SelectLabel
})

export type SelectProps = SelectRootProps
export type { SelectTriggerProps as SelectTriggerVariantProps }
