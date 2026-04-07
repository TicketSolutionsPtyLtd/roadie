'use client'

import { type ComponentProps, createContext, use } from 'react'

import { Radio } from '@base-ui/react/radio'
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group'
import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { useFieldContext } from '../Field'
import { OptionalIndicator } from '../Indicator'
import { RequiredIndicator } from '../Indicator'

/* ─── Types ─── */

type RadioGroupEmphasis = 'subtler' | 'normal'

/* ─── Context ─── */

type RadioGroupDirection = 'vertical' | 'horizontal'

interface RadioGroupContextValue {
  emphasis: RadioGroupEmphasis
  direction: RadioGroupDirection
  invalid?: boolean
  required?: boolean
}

const RadioGroupContext = createContext<RadioGroupContextValue>({
  emphasis: 'subtler',
  direction: 'vertical'
})

/* ─── Root variants ─── */

export const radioGroupVariants = cva('flex flex-wrap', {
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
          'justify-between gap-3 rounded-xl p-4 emphasis-normal is-interactive has-[:checked]:bg-[var(--color-accent-2)] has-[:checked]:border-[var(--color-accent-9)] has-[:focus-visible]:outline has-[:focus-visible]:outline-[length:var(--focus-ring-width)] has-[:focus-visible]:outline-[color-mix(in_oklch,var(--color-accent-9)_var(--focus-ring-opacity),transparent)] has-[:focus-visible]:outline-offset-0'
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
  invalid?: boolean
  required?: boolean
}

function RadioGroupRoot({
  className,
  direction = 'vertical',
  emphasis = 'subtler',
  invalid,
  required,
  ...props
}: RadioGroupRootProps) {
  const fieldContext = useFieldContext()
  const resolvedInvalid = invalid ?? fieldContext.invalid
  const resolvedRequired = required ?? fieldContext.required
  const inField = !!fieldContext.fieldId

  return (
    <RadioGroupContext
      value={{
        emphasis,
        direction: direction ?? 'vertical',
        invalid: resolvedInvalid,
        required: resolvedRequired
      }}
    >
      <RadioGroupPrimitive
        className={cn(radioGroupVariants({ direction, className }))}
        {...(inField && {
          'aria-labelledby': fieldContext.labelId || undefined,
          'aria-describedby': resolvedInvalid
            ? fieldContext.errorTextId || undefined
            : fieldContext.helperTextId || undefined
        })}
        {...props}
      />
    </RadioGroupContext>
  )
}

RadioGroupRoot.displayName = 'RadioGroup'

/* ─── Item ─── */

export interface RadioGroupItemProps extends ComponentProps<typeof Radio.Root> {
  label?: string
  description?: string
}

function RadioGroupItem({
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

/* ─── Label ─── */

export interface RadioGroupLabelProps extends ComponentProps<'label'> {
  showIndicator?: boolean
}

function RadioGroupLabel({
  className,
  showIndicator,
  children,
  ...props
}: RadioGroupLabelProps) {
  const { required } = use(RadioGroupContext)
  return (
    <label
      className={cn(
        'flex w-full items-center gap-1 text-sm font-medium text-normal',
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
    </label>
  )
}

RadioGroupLabel.displayName = 'RadioGroup.Label'

/* ─── Helper text ─── */

export interface RadioGroupHelperTextProps extends ComponentProps<'p'> {}

function RadioGroupHelperText({
  className,
  ...props
}: RadioGroupHelperTextProps) {
  return (
    <p className={cn('w-full text-sm text-subtle', className)} {...props} />
  )
}

RadioGroupHelperText.displayName = 'RadioGroup.HelperText'

/* ─── Error text ─── */

export interface RadioGroupErrorTextProps extends ComponentProps<'p'> {}

function RadioGroupErrorText({
  className,
  ...props
}: RadioGroupErrorTextProps) {
  const { invalid } = use(RadioGroupContext)
  if (invalid === false) return null
  return (
    <p
      role='alert'
      className={cn('w-full text-sm text-subtle intent-danger', className)}
      {...props}
    />
  )
}

RadioGroupErrorText.displayName = 'RadioGroup.ErrorText'

/* ─── Compound export ─── */

export const RadioGroup = Object.assign(RadioGroupRoot, {
  Item: RadioGroupItem,
  Label: RadioGroupLabel,
  HelperText: RadioGroupHelperText,
  ErrorText: RadioGroupErrorText
})

export type RadioGroupProps = RadioGroupRootProps
