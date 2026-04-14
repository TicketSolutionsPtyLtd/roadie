'use client'

import type { RefAttributes } from 'react'

import {
  type AutocompleteFilter,
  type AutocompleteFilterOptions,
  Autocomplete as AutocompletePrimitive
} from '@base-ui/react/autocomplete'
import { CaretDownIcon, XIcon } from '@phosphor-icons/react'
import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { intentVariants } from '../../variants'
import { useFieldContext } from '../Field'

export const useFilter = AutocompletePrimitive.useFilter
export const useFilteredItems = AutocompletePrimitive.useFilteredItems
export type {
  AutocompleteFilter as Filter,
  AutocompleteFilterOptions as FilterOptions
}

/* ─── Input group variants (matches Combobox/Select) ─── */

export const autocompleteInputGroupVariants = cva(
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

export type AutocompleteProps = AutocompletePrimitive.Root.Props<unknown>

export function Autocomplete(props: AutocompleteProps) {
  return <AutocompletePrimitive.Root {...props} />
}

Autocomplete.displayName = 'Autocomplete'

/* ─── Value ─── */

export type AutocompleteValueProps = AutocompletePrimitive.Value.Props

export function AutocompleteValue(props: AutocompleteValueProps) {
  return <AutocompletePrimitive.Value {...props} />
}

AutocompleteValue.displayName = 'Autocomplete.Value'

/* ─── InputGroup ─── */

export type AutocompleteInputGroupProps =
  AutocompletePrimitive.InputGroup.Props &
    RefAttributes<HTMLDivElement> &
    VariantProps<typeof autocompleteInputGroupVariants>

export function AutocompleteInputGroup({
  className,
  intent,
  emphasis,
  size,
  ...props
}: AutocompleteInputGroupProps) {
  const fieldContext = useFieldContext()
  const inField = !!fieldContext.fieldId

  return (
    <AutocompletePrimitive.InputGroup
      className={cn(
        autocompleteInputGroupVariants({ intent, emphasis, size, className })
      )}
      aria-invalid={(inField && fieldContext.invalid) || undefined}
      {...props}
    />
  )
}

AutocompleteInputGroup.displayName = 'Autocomplete.InputGroup'

/* ─── Input ─── */

export type AutocompleteInputProps = AutocompletePrimitive.Input.Props &
  RefAttributes<HTMLInputElement>

export function AutocompleteInput({
  className,
  ...props
}: AutocompleteInputProps) {
  const fieldContext = useFieldContext()
  const inField = !!fieldContext.fieldId

  return (
    <AutocompletePrimitive.Input
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

AutocompleteInput.displayName = 'Autocomplete.Input'

/* ─── Trigger ─── */

export type AutocompleteTriggerProps = AutocompletePrimitive.Trigger.Props &
  RefAttributes<HTMLButtonElement>

export function AutocompleteTrigger({
  className,
  children,
  ...props
}: AutocompleteTriggerProps) {
  return (
    <AutocompletePrimitive.Trigger
      className={cn(
        'duration-moderate shrink-0 text-subtle transition-transform data-[popup-open]:rotate-180',
        className
      )}
      {...props}
    >
      {children ?? <CaretDownIcon weight='bold' className='size-4' />}
    </AutocompletePrimitive.Trigger>
  )
}

AutocompleteTrigger.displayName = 'Autocomplete.Trigger'

/* ─── Clear ─── */

export type AutocompleteClearProps = AutocompletePrimitive.Clear.Props &
  RefAttributes<HTMLButtonElement>

export function AutocompleteClear({
  className,
  children,
  ...props
}: AutocompleteClearProps) {
  return (
    <AutocompletePrimitive.Clear
      className={cn(
        'shrink-0 cursor-pointer text-subtle hover:text-normal',
        className
      )}
      {...props}
    >
      {children ?? <XIcon weight='bold' className='size-4' />}
    </AutocompletePrimitive.Clear>
  )
}

AutocompleteClear.displayName = 'Autocomplete.Clear'

/* ─── Portal ─── */

export type AutocompletePortalProps = AutocompletePrimitive.Portal.Props &
  RefAttributes<HTMLDivElement>

export function AutocompletePortal(props: AutocompletePortalProps) {
  return <AutocompletePrimitive.Portal {...props} />
}

AutocompletePortal.displayName = 'Autocomplete.Portal'

/* ─── Positioner ─── */

export type AutocompletePositionerProps =
  AutocompletePrimitive.Positioner.Props & RefAttributes<HTMLDivElement>

export function AutocompletePositioner({
  className,
  ...props
}: AutocompletePositionerProps) {
  return (
    <AutocompletePrimitive.Positioner
      className={cn('z-50', className)}
      sideOffset={4}
      {...props}
    />
  )
}

AutocompletePositioner.displayName = 'Autocomplete.Positioner'

/* ─── Popup ─── */

export type AutocompletePopupProps = AutocompletePrimitive.Popup.Props &
  RefAttributes<HTMLDivElement>

export function AutocompletePopup({
  className,
  ...props
}: AutocompletePopupProps) {
  return (
    <AutocompletePrimitive.Popup
      className={cn(
        'max-h-[var(--available-height)] max-w-[var(--available-width)] min-w-[var(--anchor-width)] overflow-y-auto rounded-xl border border-[var(--intent-border-subtle)] bg-raised p-1 shadow-lg',
        'origin-[var(--transform-origin)] transition-[transform,scale,opacity] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
        className
      )}
      {...props}
    />
  )
}

AutocompletePopup.displayName = 'Autocomplete.Popup'

/* ─── List ─── */

export type AutocompleteListProps = AutocompletePrimitive.List.Props &
  RefAttributes<HTMLDivElement>

export function AutocompleteList({
  className,
  ...props
}: AutocompleteListProps) {
  return <AutocompletePrimitive.List className={className} {...props} />
}

AutocompleteList.displayName = 'Autocomplete.List'

/* ─── Item ─── */

export type AutocompleteItemProps = AutocompletePrimitive.Item.Props &
  RefAttributes<HTMLDivElement>

export function AutocompleteItem({
  className,
  ...props
}: AutocompleteItemProps) {
  return (
    <AutocompletePrimitive.Item
      className={cn(
        'flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-normal outline-none select-none',
        'data-[highlighted]:bg-subtle',
        className
      )}
      {...props}
    />
  )
}

AutocompleteItem.displayName = 'Autocomplete.Item'

/* ─── Collection ─── */

export type AutocompleteCollectionProps = AutocompletePrimitive.Collection.Props

export function AutocompleteCollection(props: AutocompleteCollectionProps) {
  return <AutocompletePrimitive.Collection {...props} />
}

AutocompleteCollection.displayName = 'Autocomplete.Collection'

/* ─── Group ─── */

export type AutocompleteGroupProps = AutocompletePrimitive.Group.Props &
  RefAttributes<HTMLDivElement>

export function AutocompleteGroup({
  className,
  ...props
}: AutocompleteGroupProps) {
  return (
    <AutocompletePrimitive.Group
      className={cn('[&+&]:mt-1', className)}
      {...props}
    />
  )
}

AutocompleteGroup.displayName = 'Autocomplete.Group'

/* ─── GroupLabel ─── */

export type AutocompleteGroupLabelProps =
  AutocompletePrimitive.GroupLabel.Props & RefAttributes<HTMLDivElement>

export function AutocompleteGroupLabel({
  className,
  ...props
}: AutocompleteGroupLabelProps) {
  return (
    <AutocompletePrimitive.GroupLabel
      className={cn(
        'px-2 py-1.5 text-xs font-medium text-subtle select-none',
        className
      )}
      {...props}
    />
  )
}

AutocompleteGroupLabel.displayName = 'Autocomplete.GroupLabel'

/* ─── Empty ─── */

export type AutocompleteEmptyProps = AutocompletePrimitive.Empty.Props &
  RefAttributes<HTMLDivElement>

export function AutocompleteEmpty({
  className,
  ...props
}: AutocompleteEmptyProps) {
  return (
    <AutocompletePrimitive.Empty
      className={cn(
        'text-center text-sm text-subtle empty:hidden [&:not(:empty)]:px-3 [&:not(:empty)]:py-4',
        className
      )}
      {...props}
    />
  )
}

AutocompleteEmpty.displayName = 'Autocomplete.Empty'

/* ─── Status ─── */

export type AutocompleteStatusProps = AutocompletePrimitive.Status.Props &
  RefAttributes<HTMLDivElement>

export function AutocompleteStatus({
  className,
  ...props
}: AutocompleteStatusProps) {
  return (
    <AutocompletePrimitive.Status
      className={cn('sr-only', className)}
      {...props}
    />
  )
}

AutocompleteStatus.displayName = 'Autocomplete.Status'

/* ─── Compound export ─── */

Autocomplete.Value = AutocompleteValue
Autocomplete.InputGroup = AutocompleteInputGroup
Autocomplete.Input = AutocompleteInput
Autocomplete.Trigger = AutocompleteTrigger
Autocomplete.Clear = AutocompleteClear
Autocomplete.Portal = AutocompletePortal
Autocomplete.Positioner = AutocompletePositioner
Autocomplete.Popup = AutocompletePopup
Autocomplete.List = AutocompleteList
Autocomplete.Item = AutocompleteItem
Autocomplete.Collection = AutocompleteCollection
Autocomplete.Group = AutocompleteGroup
Autocomplete.GroupLabel = AutocompleteGroupLabel
Autocomplete.Empty = AutocompleteEmpty
Autocomplete.Status = AutocompleteStatus
