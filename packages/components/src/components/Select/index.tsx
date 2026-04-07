'use client'

import { type ComponentProps, createContext, use } from 'react'

import { Select as SelectPrimitive } from '@base-ui/react/select'
import { CaretDownIcon, CaretUpIcon, CheckIcon } from '@phosphor-icons/react'
import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { OptionalIndicator } from '../Indicator'
import { RequiredIndicator } from '../Indicator'

/* ─── Context ─── */

interface SelectContextValue {
  invalid?: boolean
  required?: boolean
}

const SelectContext = createContext<SelectContextValue>({})

/* ─── Trigger variants (matches Input) ─── */

export const selectTriggerVariants = cva(
  'inline-flex w-full items-center justify-between rounded-lg font-sans select-none cursor-pointer text-left data-[popup-open]:bg-[var(--color-accent-2)] data-[popup-open]:border-[var(--color-accent-9)] data-[popup-open]:outline-[length:var(--focus-ring-width)]',
  {
    variants: {
      intent: {
        neutral: 'intent-neutral',
        brand: 'intent-brand',
        'brand-secondary': 'intent-brand-secondary',
        accent: 'intent-accent',
        danger: 'intent-danger',
        success: 'intent-success',
        warning: 'intent-warning',
        info: 'intent-info'
      },
      emphasis: {
        normal: 'emphasis-raised border border-normal is-interactive-field',
        subtle:
          'bg-subtle text-normal border border-transparent is-interactive-field'
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

export interface SelectRootProps
  extends ComponentProps<typeof SelectPrimitive.Root> {
  invalid?: boolean
  required?: boolean
}

export function SelectRoot({ invalid, required, ...props }: SelectRootProps) {
  return (
    <SelectContext value={{ invalid, required }}>
      <SelectPrimitive.Root {...props} />
    </SelectContext>
  )
}

SelectRoot.displayName = 'Select'

/* ─── Trigger ─── */

export interface SelectTriggerProps
  extends ComponentProps<typeof SelectPrimitive.Trigger>,
    VariantProps<typeof selectTriggerVariants> {}

export function SelectTrigger({
  className,
  intent,
  emphasis,
  size,
  ...props
}: SelectTriggerProps) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        selectTriggerVariants({ intent, emphasis, size, className })
      )}
      {...props}
    />
  )
}

SelectTrigger.displayName = 'Select.Trigger'

/* ─── Value ─── */

export interface SelectValueProps
  extends ComponentProps<typeof SelectPrimitive.Value> {}

export function SelectValue({ className, ...props }: SelectValueProps) {
  return (
    <SelectPrimitive.Value
      className={cn('truncate data-[placeholder]:text-subtle', className)}
      {...props}
    />
  )
}

SelectValue.displayName = 'Select.Value'

/* ─── Icon ─── */

export interface SelectIconProps
  extends ComponentProps<typeof SelectPrimitive.Icon> {}

export function SelectIcon({ className, children, ...props }: SelectIconProps) {
  return (
    <SelectPrimitive.Icon
      className={cn(
        'duration-moderate ml-2 shrink-0 text-subtle transition-transform data-[popup-open]:rotate-180',
        className
      )}
      {...props}
    >
      {children ?? <CaretDownIcon weight='bold' className='size-4' />}
    </SelectPrimitive.Icon>
  )
}

SelectIcon.displayName = 'Select.Icon'

/* ─── Portal ─── */

export interface SelectPortalProps
  extends ComponentProps<typeof SelectPrimitive.Portal> {}

export function SelectPortal(props: SelectPortalProps) {
  return <SelectPrimitive.Portal {...props} />
}

SelectPortal.displayName = 'Select.Portal'

/* ─── Positioner ─── */

export interface SelectPositionerProps
  extends ComponentProps<typeof SelectPrimitive.Positioner> {}

export function SelectPositioner({
  className,
  ...props
}: SelectPositionerProps) {
  return (
    <SelectPrimitive.Positioner
      className={cn('z-50', className)}
      alignItemWithTrigger={false}
      {...props}
    />
  )
}

SelectPositioner.displayName = 'Select.Positioner'

/* ─── Popup (dropdown content) ─── */

export interface SelectPopupProps
  extends ComponentProps<typeof SelectPrimitive.Popup> {}

export function SelectPopup({ className, ...props }: SelectPopupProps) {
  return (
    <SelectPrimitive.Popup
      className={cn(
        'min-w-[var(--anchor-width)] rounded-xl border border-[var(--intent-border-subtle)] bg-raised p-1 shadow-lg',
        'origin-[var(--transform-origin)] transition-[transform,scale,opacity] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
        className
      )}
      {...props}
    />
  )
}

SelectPopup.displayName = 'Select.Popup'

/* ─── Item ─── */

export interface SelectItemProps
  extends ComponentProps<typeof SelectPrimitive.Item> {}

export function SelectItem({ className, children, ...props }: SelectItemProps) {
  const content =
    typeof children === 'string' || typeof children === 'number' ? (
      <>
        <SelectItemText>{children}</SelectItemText>
        <SelectItemIndicator />
      </>
    ) : (
      children
    )

  return (
    <SelectPrimitive.Item
      className={cn(
        'flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-normal outline-none select-none',
        'data-[highlighted]:bg-subtle',
        className
      )}
      {...props}
    >
      {content}
    </SelectPrimitive.Item>
  )
}

SelectItem.displayName = 'Select.Item'

/* ─── ItemText ─── */

export interface SelectItemTextProps
  extends ComponentProps<typeof SelectPrimitive.ItemText> {}

export function SelectItemText(props: SelectItemTextProps) {
  return <SelectPrimitive.ItemText {...props} />
}

SelectItemText.displayName = 'Select.ItemText'

/* ─── ItemIndicator ─── */

export interface SelectItemIndicatorProps
  extends ComponentProps<typeof SelectPrimitive.ItemIndicator> {}

export function SelectItemIndicator({
  className,
  children,
  ...props
}: SelectItemIndicatorProps) {
  return (
    <SelectPrimitive.ItemIndicator
      className={cn('shrink-0 text-subtle', className)}
      {...props}
    >
      {children ?? <CheckIcon weight='bold' className='size-4' />}
    </SelectPrimitive.ItemIndicator>
  )
}

SelectItemIndicator.displayName = 'Select.ItemIndicator'

/* ─── Group ─── */

export interface SelectGroupProps
  extends ComponentProps<typeof SelectPrimitive.Group> {}

export function SelectGroup({ className, ...props }: SelectGroupProps) {
  return (
    <SelectPrimitive.Group className={cn('[&+&]:mt-1', className)} {...props} />
  )
}

SelectGroup.displayName = 'Select.Group'

/* ─── GroupLabel ─── */

export interface SelectGroupLabelProps
  extends ComponentProps<typeof SelectPrimitive.GroupLabel> {}

export function SelectGroupLabel({
  className,
  ...props
}: SelectGroupLabelProps) {
  return (
    <SelectPrimitive.GroupLabel
      className={cn(
        'px-2 py-1.5 text-xs font-medium text-subtle select-none',
        className
      )}
      {...props}
    />
  )
}

SelectGroupLabel.displayName = 'Select.GroupLabel'

/* ─── Label ─── */

export interface SelectLabelProps
  extends ComponentProps<typeof SelectPrimitive.Label> {
  showIndicator?: boolean
}

export function SelectLabel({
  className,
  showIndicator,
  children,
  ...props
}: SelectLabelProps) {
  const { required } = use(SelectContext)
  return (
    <SelectPrimitive.Label
      className={cn(
        'flex items-center gap-1 text-sm font-medium text-normal',
        className
      )}
      {...props}
    >
      {children}
      {showIndicator &&
        (required ? (
          <>
            {' '}
            <RequiredIndicator />
          </>
        ) : (
          <>
            {' '}
            <OptionalIndicator />
          </>
        ))}
    </SelectPrimitive.Label>
  )
}

SelectLabel.displayName = 'Select.Label'

/* ─── ScrollUpArrow ─── */

export interface SelectScrollUpArrowProps
  extends ComponentProps<typeof SelectPrimitive.ScrollUpArrow> {}

export function SelectScrollUpArrow({
  className,
  ...props
}: SelectScrollUpArrowProps) {
  return (
    <SelectPrimitive.ScrollUpArrow
      className={cn(
        'flex items-center justify-center py-1 text-subtle',
        className
      )}
      {...props}
    >
      <CaretUpIcon weight='bold' className='size-3' />
    </SelectPrimitive.ScrollUpArrow>
  )
}

SelectScrollUpArrow.displayName = 'Select.ScrollUpArrow'

/* ─── ScrollDownArrow ─── */

export interface SelectScrollDownArrowProps
  extends ComponentProps<typeof SelectPrimitive.ScrollDownArrow> {}

export function SelectScrollDownArrow({
  className,
  ...props
}: SelectScrollDownArrowProps) {
  return (
    <SelectPrimitive.ScrollDownArrow
      className={cn(
        'flex items-center justify-center py-1 text-subtle',
        className
      )}
      {...props}
    >
      <CaretDownIcon weight='bold' className='size-3' />
    </SelectPrimitive.ScrollDownArrow>
  )
}

SelectScrollDownArrow.displayName = 'Select.ScrollDownArrow'

/* ─── HelperText ─── */

export interface SelectHelperTextProps extends ComponentProps<'p'> {}

export function SelectHelperText({
  className,
  ...props
}: SelectHelperTextProps) {
  return <p className={cn('text-sm text-subtle', className)} {...props} />
}

SelectHelperText.displayName = 'Select.HelperText'

/* ─── ErrorText ─── */

export interface SelectErrorTextProps extends ComponentProps<'p'> {}

export function SelectErrorText({ className, ...props }: SelectErrorTextProps) {
  const { invalid } = use(SelectContext)
  if (invalid === false) return null
  return (
    <p
      role='alert'
      className={cn('text-sm text-subtle intent-danger', className)}
      {...props}
    />
  )
}

SelectErrorText.displayName = 'Select.ErrorText'

/* ─── Content (convenience wrapper) ─── */

export interface SelectContentProps extends SelectPopupProps {}

export function SelectContent({ children, ...props }: SelectContentProps) {
  return (
    <SelectPortal>
      <SelectPositioner>
        <SelectPopup {...props}>{children}</SelectPopup>
      </SelectPositioner>
    </SelectPortal>
  )
}

SelectContent.displayName = 'Select.Content'

/* ─── Compound export ─── */

export const Select = Object.assign(SelectRoot, {
  Trigger: SelectTrigger,
  Value: SelectValue,
  Icon: SelectIcon,
  Portal: SelectPortal,
  Positioner: SelectPositioner,
  Popup: SelectPopup,
  Content: SelectContent,
  Item: SelectItem,
  ItemText: SelectItemText,
  ItemIndicator: SelectItemIndicator,
  Group: SelectGroup,
  GroupLabel: SelectGroupLabel,
  Label: SelectLabel,
  HelperText: SelectHelperText,
  ErrorText: SelectErrorText,
  ScrollUpArrow: SelectScrollUpArrow,
  ScrollDownArrow: SelectScrollDownArrow
})

export type SelectProps = SelectRootProps
export type { SelectTriggerProps as SelectTriggerVariantProps }
