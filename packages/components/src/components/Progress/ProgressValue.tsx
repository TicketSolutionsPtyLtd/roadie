'use client'

import { type ReactNode, type RefAttributes, use } from 'react'

import { Progress as ProgressPrimitive } from '@base-ui/react/progress'

import { cn } from '@oztix/roadie-core/utils'

import { ProgressValueTextContext } from './ProgressContext'

type ValueRenderer = NonNullable<ProgressPrimitive.Value.Props['children']>

export type ProgressValueProps = Omit<
  ProgressPrimitive.Value.Props,
  'children'
> &
  RefAttributes<HTMLSpanElement> & {
    /** Text to show, or a function of the formatted and raw value. Defaults to the root's `valueText`, then a percentage. */
    children?: ReactNode | ValueRenderer
  }

export function ProgressValue({
  className,
  children,
  ...props
}: ProgressValueProps) {
  const valueText = use(ProgressValueTextContext)
  const text = children ?? valueText
  return (
    <ProgressPrimitive.Value
      data-slot='progress-value'
      className={cn(
        'col-start-2 justify-self-end text-sm whitespace-nowrap text-subtle tabular-nums',
        className
      )}
      {...props}
    >
      {typeof text === 'function' || text == null ? text : () => text}
    </ProgressPrimitive.Value>
  )
}

ProgressValue.displayName = 'Progress.Value'
