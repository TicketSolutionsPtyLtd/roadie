'use client'

import { type RefAttributes, use } from 'react'

import { Select as SelectPrimitive } from '@base-ui/react/select'

import { cn } from '@oztix/roadie-core/utils'

import { OptionalIndicator, RequiredIndicator } from '../Indicator'
import { SelectContext } from './SelectContext'

export type SelectLabelProps = SelectPrimitive.Label.Props &
  RefAttributes<HTMLDivElement> & {
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
      data-slot='select-label'
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
