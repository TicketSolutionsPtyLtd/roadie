'use client'

import { type ComponentProps, useId, useMemo } from 'react'

import { type VariantProps } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { AccordionContext } from './AccordionContext'
import { accordionVariants } from './variants'

type AccordionType = 'single' | 'multiple'

export type AccordionRootProps = ComponentProps<'div'> &
  VariantProps<typeof accordionVariants> & {
    type?: AccordionType
  }

export function AccordionRoot({
  type = 'single',
  intent,
  emphasis,
  className,
  ...props
}: AccordionRootProps) {
  const id = useId()
  const name = type === 'single' ? `accordion-${id}` : undefined

  const contextValue = useMemo(
    () => ({ name, emphasis: emphasis ?? 'normal' }),
    [name, emphasis]
  )

  return (
    <AccordionContext value={contextValue}>
      <div
        data-slot='accordion'
        className={cn(accordionVariants({ intent, emphasis, className }))}
        {...props}
      />
    </AccordionContext>
  )
}

AccordionRoot.displayName = 'Accordion.Root'
