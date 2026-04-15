import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

// Mobile (default): a flex `justify-between` row. With the recommended
// `<Title /><Dots /><Controls hidden on mobile />` arrangement that puts
// the Title on the left and the Dots on the right — Controls vanish via
// their own responsive `hidden md:flex`.
//
// Desktop (md+): a three-column grid (`1fr auto 1fr`). Children are placed
// by position in source order:
//
//   1 child  → left only (e.g. just a Title)
//   2 children → left + right (Title + Controls)
//   3 children → left + centre + right (Title + Dots + Controls)
//
// Selectors target position rather than component type so consumers can
// drop in custom nodes (a search box in the middle, an extra link on the
// right) without losing the layout.

export type CarouselHeaderProps = ComponentProps<'div'>

export function CarouselHeader({ className, ...props }: CarouselHeaderProps) {
  return (
    <div
      data-slot='carousel-header'
      className={cn(
        'mb-4 flex items-center justify-between gap-4',
        'md:grid md:grid-cols-[1fr_auto_1fr]',
        'md:[&>*:first-child]:justify-self-start',
        'md:[&>*:last-child:not(:first-child)]:col-start-3',
        'md:[&>*:last-child:not(:first-child)]:justify-self-end',
        'md:[&>*:nth-child(2):not(:last-child)]:col-start-2',
        'md:[&>*:nth-child(2):not(:last-child)]:justify-self-center',
        className
      )}
      {...props}
    />
  )
}

CarouselHeader.displayName = 'Carousel.Header'
