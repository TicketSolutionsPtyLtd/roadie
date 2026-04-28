'use client'

import { type ComponentProps, useCallback } from 'react'

import { CaretDownIcon } from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

export type AccordionTriggerProps = ComponentProps<'summary'>

export function AccordionTrigger({
  className,
  children,
  onClick,
  ...props
}: AccordionTriggerProps) {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      onClick?.(e)

      // Only measure for browsers without interpolate-size (Safari)
      if (
        typeof CSS !== 'undefined' &&
        CSS.supports?.('interpolate-size', 'allow-keywords')
      )
        return

      const details = e.currentTarget.closest('details')
      if (!details || details.open) return

      // Temporarily open to measure content, then close before browser toggles
      details.open = true
      const content = details.querySelector(
        ':scope > :not(summary)'
      ) as HTMLElement
      if (content?.scrollHeight) {
        details.style.setProperty(
          '--content-height',
          `${content.scrollHeight}px`
        )
      }
      details.open = false
    },
    [onClick]
  )

  return (
    <summary
      data-slot='accordion-trigger'
      className={cn(
        'flex w-full cursor-pointer list-none items-center justify-between px-4 py-3 text-left font-medium text-normal transition-colors hover:bg-subtle [&::-webkit-details-marker]:hidden',
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {children}
      <CaretDownIcon
        weight='bold'
        className='size-4 shrink-0 text-subtle transition-transform duration-moderate ease-enter group-open/item:rotate-180'
      />
    </summary>
  )
}

AccordionTrigger.displayName = 'Accordion.Trigger'
