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
      // body points outward.
      //
      // Sizes derive from one source of truth — `--arrow-w` / `--arrow-h`,
      // which also size the SVG below — so the box and its offsets can never
      // drift. On top/bottom the depth is `--arrow-h`, so a 1px-overlap sits
      // at `1px - h`. On left/right the box is rotated 90°, so the outward
      // reach is half its width plus half its depth → `1px - (w + h) / 2`.
      className={cn(
        'z-10 flex [--arrow-h:0.5rem] [--arrow-w:1rem]',
        'data-[side=bottom]:top-[calc(1px_-_var(--arrow-h))] data-[side=bottom]:rotate-0',
        'data-[side=top]:bottom-[calc(1px_-_var(--arrow-h))] data-[side=top]:rotate-180',
        'data-[side=left]:right-[calc(1px_-_(var(--arrow-w)_+_var(--arrow-h))/2)] data-[side=left]:rotate-90',
        'data-[side=right]:left-[calc(1px_-_(var(--arrow-w)_+_var(--arrow-h))/2)] data-[side=right]:-rotate-90',
        className
      )}
      {...props}
    >
      <svg
        aria-hidden='true'
        viewBox='0 0 20 10'
        // Fill with the cascading intent raised colour (inherited from the
        // popup's intent context) so the arrow matches a coloured popup.
        // `--background-color-raised` resolves at :root and would always be
        // neutral, so use `--intent-bg-raised` directly. The open path means
        // the stroke only paints the two outward slanted edges, giving them
        // the same rim-light highlight as the popup surface.
        className='h-(--arrow-h) w-(--arrow-w) fill-(--intent-bg-raised) stroke-(--rim-light-edge)'
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
