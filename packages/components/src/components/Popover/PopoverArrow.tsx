'use client'

import type { RefAttributes } from 'react'

import { Popover as PopoverPrimitive } from '@base-ui/react/popover'

import { cn } from '@oztix/roadie-core/utils'

export type PopoverArrowProps = PopoverPrimitive.Arrow.Props &
  RefAttributes<HTMLDivElement>

export function PopoverArrow({ className, ...props }: PopoverArrowProps) {
  return (
    <PopoverPrimitive.Arrow
      data-slot='popover-arrow'
      // Base UI only positions the arrow on the cross axis, so we push it
      // onto the popup edge on the main axis. The triangle's base overlaps
      // the popup by 1px (z-10, on top) so it paints over the rim-light
      // line and reads as a seamless continuation of the surface, while the
      // body points outward. The base/depth is 8px → top/bottom shift by
      // -7px; on the left/right the 16px-wide box is centred on the edge →
      // -11px (both 1px less than flush to create the overlap).
      className={cn(
        'z-10 flex data-[side=bottom]:top-[-7px] data-[side=bottom]:rotate-0 data-[side=left]:right-[-11px] data-[side=left]:rotate-90 data-[side=right]:left-[-11px] data-[side=right]:-rotate-90 data-[side=top]:bottom-[-7px] data-[side=top]:rotate-180',
        className
      )}
      {...props}
    >
      <svg
        width='16'
        height='8'
        viewBox='0 0 20 10'
        // Fill with the cascading intent raised colour (inherited from the
        // popup's intent context) so the arrow matches a coloured popup.
        // `--background-color-raised` resolves at :root and would always be
        // neutral, so use `--intent-bg-raised` directly. The open path means
        // the stroke only paints the two outward slanted edges, giving them
        // the same rim-light highlight as the popup surface.
        className='fill-(--intent-bg-raised) stroke-(--rim-light-edge)'
        strokeWidth='1'
        strokeLinejoin='round'
        strokeLinecap='round'
      >
        <path d='M0 10 L10 0 L20 10' />
      </svg>
    </PopoverPrimitive.Arrow>
  )
}

PopoverArrow.displayName = 'Popover.Arrow'
