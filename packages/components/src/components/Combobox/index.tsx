'use client'

import type { ComponentProps } from 'react'

import {
  type ComboboxFilter,
  type ComboboxFilterOptions,
  Combobox as ComboboxPrimitive
} from '@base-ui/react/combobox'
import { CaretDownIcon, CheckIcon, XIcon } from '@phosphor-icons/react'
import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

export const useFilter = ComboboxPrimitive.useFilter
export type { ComboboxFilter as Filter, ComboboxFilterOptions as FilterOptions }

/* ─── Input group variants (matches Input/Select trigger) ─── */

export const comboboxInputGroupVariants = cva(
  'inline-flex w-full items-center rounded-lg font-sans',
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
        normal:
          'emphasis-raised border border-normal is-interactive-field-group',
        subtle:
          'bg-subtle text-normal border border-transparent is-interactive-field-group'
      },
      size: {
        sm: 'h-8 px-1.5 text-base',
        md: 'h-10 px-2 text-base',
        lg: 'h-12 px-2 text-base'
      }
    },
    defaultVariants: {
      emphasis: 'normal',
      size: 'md'
    }
  }
)

/* ─── Root ─── */

export interface ComboboxRootProps
  extends ComponentProps<typeof ComboboxPrimitive.Root> {}

export function ComboboxRoot(props: ComboboxRootProps) {
  return <ComboboxPrimitive.Root {...props} />
}

ComboboxRoot.displayName = 'Combobox'

/* ─── Label ─── */

export interface ComboboxLabelProps
  extends ComponentProps<typeof ComboboxPrimitive.Label> {}

export function ComboboxLabel({ className, ...props }: ComboboxLabelProps) {
  return (
    <ComboboxPrimitive.Label
      className={cn('text-sm font-medium text-normal', className)}
      {...props}
    />
  )
}

ComboboxLabel.displayName = 'Combobox.Label'

/* ─── InputGroup ─── */

export interface ComboboxInputGroupProps
  extends ComponentProps<typeof ComboboxPrimitive.InputGroup>,
    VariantProps<typeof comboboxInputGroupVariants> {}

export function ComboboxInputGroup({
  className,
  intent,
  emphasis,
  size,
  ...props
}: ComboboxInputGroupProps) {
  return (
    <ComboboxPrimitive.InputGroup
      className={cn(
        comboboxInputGroupVariants({ intent, emphasis, size, className })
      )}
      {...props}
    />
  )
}

ComboboxInputGroup.displayName = 'Combobox.InputGroup'

/* ─── Input ─── */

export interface ComboboxInputProps
  extends ComponentProps<typeof ComboboxPrimitive.Input> {}

export function ComboboxInput({ className, ...props }: ComboboxInputProps) {
  return (
    <ComboboxPrimitive.Input
      className={cn(
        'min-w-0 flex-1 bg-transparent outline-none placeholder:text-subtle',
        className
      )}
      {...props}
    />
  )
}

ComboboxInput.displayName = 'Combobox.Input'

/* ─── Trigger ─── */

export interface ComboboxTriggerProps
  extends ComponentProps<typeof ComboboxPrimitive.Trigger> {}

export function ComboboxTrigger({
  className,
  children,
  ...props
}: ComboboxTriggerProps) {
  return (
    <ComboboxPrimitive.Trigger
      className={cn(
        'duration-moderate shrink-0 text-subtle transition-transform data-[popup-open]:rotate-180',
        className
      )}
      {...props}
    >
      {children ?? <CaretDownIcon weight='bold' className='size-4' />}
    </ComboboxPrimitive.Trigger>
  )
}

ComboboxTrigger.displayName = 'Combobox.Trigger'

/* ─── Clear ─── */

export interface ComboboxClearProps
  extends ComponentProps<typeof ComboboxPrimitive.Clear> {}

export function ComboboxClear({
  className,
  children,
  ...props
}: ComboboxClearProps) {
  return (
    <ComboboxPrimitive.Clear
      className={cn(
        'shrink-0 cursor-pointer text-subtle hover:text-normal',
        className
      )}
      {...props}
    >
      {children ?? <XIcon weight='bold' className='size-4' />}
    </ComboboxPrimitive.Clear>
  )
}

ComboboxClear.displayName = 'Combobox.Clear'

/* ─── Portal ─── */

export interface ComboboxPortalProps
  extends ComponentProps<typeof ComboboxPrimitive.Portal> {}

export function ComboboxPortal(props: ComboboxPortalProps) {
  return <ComboboxPrimitive.Portal {...props} />
}

ComboboxPortal.displayName = 'Combobox.Portal'

/* ─── Positioner ─── */

export interface ComboboxPositionerProps
  extends ComponentProps<typeof ComboboxPrimitive.Positioner> {}

export function ComboboxPositioner({
  className,
  ...props
}: ComboboxPositionerProps) {
  return (
    <ComboboxPrimitive.Positioner
      className={cn('z-50', className)}
      sideOffset={4}
      {...props}
    />
  )
}

ComboboxPositioner.displayName = 'Combobox.Positioner'

/* ─── Popup ─── */

export interface ComboboxPopupProps
  extends ComponentProps<typeof ComboboxPrimitive.Popup> {}

export function ComboboxPopup({ className, ...props }: ComboboxPopupProps) {
  return (
    <ComboboxPrimitive.Popup
      className={cn(
        'min-w-[var(--anchor-width)] rounded-xl border border-[var(--intent-border-subtle)] bg-raised p-1 shadow-lg',
        'origin-[var(--transform-origin)] transition-[transform,scale,opacity] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
        className
      )}
      {...props}
    />
  )
}

ComboboxPopup.displayName = 'Combobox.Popup'

/* ─── List ─── */

export interface ComboboxListProps
  extends ComponentProps<typeof ComboboxPrimitive.List> {}

export function ComboboxList({ className, ...props }: ComboboxListProps) {
  return <ComboboxPrimitive.List className={className} {...props} />
}

ComboboxList.displayName = 'Combobox.List'

/* ─── Item ─── */

export interface ComboboxItemProps
  extends ComponentProps<typeof ComboboxPrimitive.Item> {}

export function ComboboxItem({ className, ...props }: ComboboxItemProps) {
  return (
    <ComboboxPrimitive.Item
      className={cn(
        'flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-normal outline-none select-none',
        'data-[highlighted]:bg-subtle',
        className
      )}
      {...props}
    />
  )
}

ComboboxItem.displayName = 'Combobox.Item'

/* ─── Collection ─── */

export interface ComboboxCollectionProps
  extends ComponentProps<typeof ComboboxPrimitive.Collection> {}

export function ComboboxCollection(props: ComboboxCollectionProps) {
  return <ComboboxPrimitive.Collection {...props} />
}

ComboboxCollection.displayName = 'Combobox.Collection'

/* ─── ItemIndicator ─── */

export interface ComboboxItemIndicatorProps
  extends ComponentProps<typeof ComboboxPrimitive.ItemIndicator> {}

export function ComboboxItemIndicator({
  className,
  children,
  ...props
}: ComboboxItemIndicatorProps) {
  return (
    <ComboboxPrimitive.ItemIndicator
      className={cn('shrink-0 text-subtle', className)}
      {...props}
    >
      {children ?? <CheckIcon weight='bold' className='size-4' />}
    </ComboboxPrimitive.ItemIndicator>
  )
}

ComboboxItemIndicator.displayName = 'Combobox.ItemIndicator'

/* ─── Group ─── */

export interface ComboboxGroupProps
  extends ComponentProps<typeof ComboboxPrimitive.Group> {}

export function ComboboxGroup({ className, ...props }: ComboboxGroupProps) {
  return (
    <ComboboxPrimitive.Group
      className={cn('[&+&]:mt-1', className)}
      {...props}
    />
  )
}

ComboboxGroup.displayName = 'Combobox.Group'

/* ─── GroupLabel ─── */

export interface ComboboxGroupLabelProps
  extends ComponentProps<typeof ComboboxPrimitive.GroupLabel> {}

export function ComboboxGroupLabel({
  className,
  ...props
}: ComboboxGroupLabelProps) {
  return (
    <ComboboxPrimitive.GroupLabel
      className={cn(
        'px-2 py-1.5 text-xs font-medium text-subtle select-none',
        className
      )}
      {...props}
    />
  )
}

ComboboxGroupLabel.displayName = 'Combobox.GroupLabel'

/* ─── Empty ─── */

export interface ComboboxEmptyProps
  extends ComponentProps<typeof ComboboxPrimitive.Empty> {}

export function ComboboxEmpty({ className, ...props }: ComboboxEmptyProps) {
  return (
    <ComboboxPrimitive.Empty
      className={cn(
        'text-center text-sm text-subtle empty:hidden [&:not(:empty)]:px-3 [&:not(:empty)]:py-4',
        className
      )}
      {...props}
    />
  )
}

ComboboxEmpty.displayName = 'Combobox.Empty'

/* ─── Status ─── */

export interface ComboboxStatusProps
  extends ComponentProps<typeof ComboboxPrimitive.Status> {}

export function ComboboxStatus({ className, ...props }: ComboboxStatusProps) {
  return (
    <ComboboxPrimitive.Status className={cn('sr-only', className)} {...props} />
  )
}

ComboboxStatus.displayName = 'Combobox.Status'

/* ─── Compound export ─── */

export const Combobox = Object.assign(ComboboxRoot, {
  Label: ComboboxLabel,
  InputGroup: ComboboxInputGroup,
  Input: ComboboxInput,
  Trigger: ComboboxTrigger,
  Clear: ComboboxClear,
  Portal: ComboboxPortal,
  Positioner: ComboboxPositioner,
  Popup: ComboboxPopup,
  List: ComboboxList,
  Item: ComboboxItem,
  Collection: ComboboxCollection,
  ItemIndicator: ComboboxItemIndicator,
  Group: ComboboxGroup,
  GroupLabel: ComboboxGroupLabel,
  Empty: ComboboxEmpty,
  Status: ComboboxStatus
})

export type ComboboxProps = ComboboxRootProps
