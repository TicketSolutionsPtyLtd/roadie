'use client'

import type { RefAttributes } from 'react'

import {
  type ComboboxFilter,
  type ComboboxFilterOptions,
  Combobox as ComboboxPrimitive
} from '@base-ui/react/combobox'
import { CaretDownIcon, CheckIcon, XIcon } from '@phosphor-icons/react'
import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { intentVariants } from '../../variants'
import { useFieldContext } from '../Field'

export const useFilter = ComboboxPrimitive.useFilter
export type { ComboboxFilter as Filter, ComboboxFilterOptions as FilterOptions }

/* ─── Input group variants (matches Input/Select trigger) ─── */

export const comboboxInputGroupVariants = cva(
  'inline-flex w-full items-center rounded-lg font-sans',
  {
    variants: {
      intent: intentVariants,
      emphasis: {
        normal:
          'emphasis-sunken border border-subtle is-interactive-field-group',
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

export type ComboboxProps = ComboboxPrimitive.Root.Props<unknown>

export function Combobox(props: ComboboxProps) {
  return <ComboboxPrimitive.Root {...props} />
}

Combobox.displayName = 'Combobox'

/* ─── Label ─── */

export type ComboboxLabelProps = ComboboxPrimitive.Label.Props &
  RefAttributes<HTMLDivElement>

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

export type ComboboxInputGroupProps = ComboboxPrimitive.InputGroup.Props &
  RefAttributes<HTMLDivElement> &
  VariantProps<typeof comboboxInputGroupVariants>

export function ComboboxInputGroup({
  className,
  intent,
  emphasis,
  size,
  ...props
}: ComboboxInputGroupProps) {
  const fieldContext = useFieldContext()
  const inField = !!fieldContext.fieldId

  return (
    <ComboboxPrimitive.InputGroup
      className={cn(
        comboboxInputGroupVariants({ intent, emphasis, size, className })
      )}
      aria-invalid={(inField && fieldContext.invalid) || undefined}
      {...props}
    />
  )
}

ComboboxInputGroup.displayName = 'Combobox.InputGroup'

/* ─── Input ─── */

export type ComboboxInputProps = ComboboxPrimitive.Input.Props &
  RefAttributes<HTMLInputElement>

export function ComboboxInput({ className, ...props }: ComboboxInputProps) {
  const fieldContext = useFieldContext()
  const inField = !!fieldContext.fieldId

  return (
    <ComboboxPrimitive.Input
      className={cn(
        'min-w-0 flex-1 bg-transparent outline-none placeholder:text-subtle',
        className
      )}
      {...(inField && {
        id: fieldContext.fieldId,
        'aria-invalid': fieldContext.invalid || undefined,
        'aria-required': fieldContext.required || undefined,
        'aria-describedby': fieldContext.invalid
          ? fieldContext.errorTextId || undefined
          : fieldContext.helperTextId || undefined
      })}
      {...props}
    />
  )
}

ComboboxInput.displayName = 'Combobox.Input'

/* ─── Trigger ─── */

export type ComboboxTriggerProps = ComboboxPrimitive.Trigger.Props &
  RefAttributes<HTMLButtonElement>

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

export type ComboboxClearProps = ComboboxPrimitive.Clear.Props &
  RefAttributes<HTMLButtonElement>

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

export type ComboboxPortalProps = ComboboxPrimitive.Portal.Props &
  RefAttributes<HTMLDivElement>

export function ComboboxPortal(props: ComboboxPortalProps) {
  return <ComboboxPrimitive.Portal {...props} />
}

ComboboxPortal.displayName = 'Combobox.Portal'

/* ─── Positioner ─── */

export type ComboboxPositionerProps = ComboboxPrimitive.Positioner.Props &
  RefAttributes<HTMLDivElement>

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

export type ComboboxPopupProps = ComboboxPrimitive.Popup.Props &
  RefAttributes<HTMLDivElement>

export function ComboboxPopup({ className, ...props }: ComboboxPopupProps) {
  return (
    <ComboboxPrimitive.Popup
      className={cn(
        'max-h-[var(--available-height)] max-w-[var(--available-width)] min-w-[var(--anchor-width)] overflow-y-auto rounded-xl border border-[var(--intent-border-subtle)] bg-raised p-1 shadow-lg',
        'origin-[var(--transform-origin)] transition-[transform,scale,opacity] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
        className
      )}
      {...props}
    />
  )
}

ComboboxPopup.displayName = 'Combobox.Popup'

/* ─── List ─── */

export type ComboboxListProps = ComboboxPrimitive.List.Props &
  RefAttributes<HTMLDivElement>

export function ComboboxList({ className, ...props }: ComboboxListProps) {
  return <ComboboxPrimitive.List className={className} {...props} />
}

ComboboxList.displayName = 'Combobox.List'

/* ─── Item ─── */

export type ComboboxItemProps = ComboboxPrimitive.Item.Props &
  RefAttributes<HTMLDivElement>

export function ComboboxItem({ className, ...props }: ComboboxItemProps) {
  return (
    <ComboboxPrimitive.Item
      className={cn(
        'flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-normal outline-none select-none',
        'data-[highlighted]:bg-subtle',
        className
      )}
      {...props}
    />
  )
}

ComboboxItem.displayName = 'Combobox.Item'

/* ─── Collection ─── */

export type ComboboxCollectionProps = ComboboxPrimitive.Collection.Props

export function ComboboxCollection(props: ComboboxCollectionProps) {
  return <ComboboxPrimitive.Collection {...props} />
}

ComboboxCollection.displayName = 'Combobox.Collection'

/* ─── ItemIndicator ─── */

export type ComboboxItemIndicatorProps = ComboboxPrimitive.ItemIndicator.Props &
  RefAttributes<HTMLSpanElement>

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

export type ComboboxGroupProps = ComboboxPrimitive.Group.Props &
  RefAttributes<HTMLDivElement>

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

export type ComboboxGroupLabelProps = ComboboxPrimitive.GroupLabel.Props &
  RefAttributes<HTMLDivElement>

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

export type ComboboxEmptyProps = ComboboxPrimitive.Empty.Props &
  RefAttributes<HTMLDivElement>

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

export type ComboboxStatusProps = ComboboxPrimitive.Status.Props &
  RefAttributes<HTMLDivElement>

export function ComboboxStatus({ className, ...props }: ComboboxStatusProps) {
  return (
    <ComboboxPrimitive.Status className={cn('sr-only', className)} {...props} />
  )
}

ComboboxStatus.displayName = 'Combobox.Status'

/* ─── Compound export ─── */

Combobox.Label = ComboboxLabel
Combobox.InputGroup = ComboboxInputGroup
Combobox.Input = ComboboxInput
Combobox.Trigger = ComboboxTrigger
Combobox.Clear = ComboboxClear
Combobox.Portal = ComboboxPortal
Combobox.Positioner = ComboboxPositioner
Combobox.Popup = ComboboxPopup
Combobox.List = ComboboxList
Combobox.Item = ComboboxItem
Combobox.Collection = ComboboxCollection
Combobox.ItemIndicator = ComboboxItemIndicator
Combobox.Group = ComboboxGroup
Combobox.GroupLabel = ComboboxGroupLabel
Combobox.Empty = ComboboxEmpty
Combobox.Status = ComboboxStatus
