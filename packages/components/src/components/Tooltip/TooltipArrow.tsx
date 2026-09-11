'use client'

import type { RefAttributes } from 'react'

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'

import { cn } from '@oztix/roadie-core/utils'

export type TooltipArrowProps = TooltipPrimitive.Arrow.Props &
  RefAttributes<HTMLDivElement>

// Popover.Arrow's geometry (see its comment for the offsets), smaller. The
// open path strokes only the slanted edges, so the floating surface's rim
// carries onto the arrow. Base UI keeps inline-* sides logical, so those
// use logical insets and flip their rotation in RTL.
export function TooltipArrow({ className, ...props }: TooltipArrowProps) {
  return (
    <TooltipPrimitive.Arrow
      data-slot='tooltip-arrow'
      className={cn(
        'z-10 flex [--arrow-h:0.375rem] [--arrow-w:0.75rem]',
        'data-[side=bottom]:top-[calc(1px-var(--arrow-h))] data-[side=bottom]:rotate-0',
        'data-[side=top]:bottom-[calc(1px-var(--arrow-h))] data-[side=top]:rotate-180',
        'data-[side=left]:right-[calc(1px-(var(--arrow-w)+var(--arrow-h))/2)] data-[side=left]:rotate-90',
        'data-[side=right]:left-[calc(1px-(var(--arrow-w)+var(--arrow-h))/2)] data-[side=right]:-rotate-90',
        'data-[side=inline-start]:end-[calc(1px-(var(--arrow-w)+var(--arrow-h))/2)] data-[side=inline-start]:rotate-90 rtl:data-[side=inline-start]:-rotate-90',
        'data-[side=inline-end]:start-[calc(1px-(var(--arrow-w)+var(--arrow-h))/2)] data-[side=inline-end]:-rotate-90 rtl:data-[side=inline-end]:rotate-90',
        className
      )}
      {...props}
    >
      <svg
        aria-hidden='true'
        viewBox='0 0 20 10'
        className='h-(--arrow-h) w-(--arrow-w) fill-(--tooltip-surface) stroke-(--tooltip-rim)'
        strokeWidth='1'
        strokeLinejoin='round'
        strokeLinecap='round'
      >
        <path d='M0 10 L10 0 L20 10' />
      </svg>
    </TooltipPrimitive.Arrow>
  )
}

TooltipArrow.displayName = 'Tooltip.Arrow'
