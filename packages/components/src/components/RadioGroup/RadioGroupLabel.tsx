'use client'

import { type ComponentProps, use, useEffect, useId } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { OptionalIndicator, RequiredIndicator } from '../Indicator'
import { RadioGroupContext } from './RadioGroupContext'

export type RadioGroupLabelProps = ComponentProps<'label'> & {
  showIndicator?: boolean
}

export function RadioGroupLabel({
  className,
  id: idProp,
  showIndicator,
  children,
  ...props
}: RadioGroupLabelProps) {
  const { required, setLabelId } = use(RadioGroupContext)
  const generatedId = useId()
  const id = idProp ?? generatedId

  useEffect(() => {
    setLabelId?.(id)
    return () => setLabelId?.(undefined)
  }, [id, setLabelId])

  return (
    <label
      id={id}
      data-slot='radio-group-label'
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
