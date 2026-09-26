'use client'

import { type ComponentProps, use, useEffect, useId } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { CheckboxGroupContext } from '../Checkbox/CheckboxGroupContext'
import { OptionalIndicator, RequiredIndicator } from '../Indicator'

export type CheckboxGroupLabelProps = ComponentProps<'label'> & {
  showIndicator?: boolean
}

export function CheckboxGroupLabel({
  className,
  id: idProp,
  showIndicator,
  children,
  ...props
}: CheckboxGroupLabelProps) {
  const group = use(CheckboxGroupContext)
  const generatedId = useId()
  const id = idProp ?? generatedId
  const setLabelId = group?.setLabelId

  useEffect(() => {
    setLabelId?.(id)
    return () => setLabelId?.(undefined)
  }, [id, setLabelId])

  return (
    <label
      id={id}
      data-slot='checkbox-group-label'
      className={cn(
        'flex w-full items-center gap-1 text-sm font-medium text-normal',
        className
      )}
      {...props}
    >
      {children}
      {showIndicator &&
        (group?.required ? (
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

CheckboxGroupLabel.displayName = 'CheckboxGroup.Label'
