// Subpath entry for `@oztix/roadie-components/carousel`.
//
// NO `'use client'` — server-safe property-assignment layer.
// See docs/contributing/COMPOUND_PATTERNS.md.
import { CarouselContent } from './CarouselContent'
import { CarouselControls } from './CarouselControls'
import { CarouselDots } from './CarouselDots'
import { CarouselHeader } from './CarouselHeader'
import { CarouselItem } from './CarouselItem'
import { CarouselNext } from './CarouselNext'
import { CarouselPlayPause } from './CarouselPlayPause'
import { CarouselPrevious } from './CarouselPrevious'
import { CarouselRoot } from './CarouselRoot'
import { CarouselTitle } from './CarouselTitle'
import { CarouselTitleLink } from './CarouselTitleLink'

const Carousel = CarouselRoot as typeof CarouselRoot & {
  Root: typeof CarouselRoot
  Header: typeof CarouselHeader
  Title: typeof CarouselTitle
  TitleLink: typeof CarouselTitleLink
  Controls: typeof CarouselControls
  Content: typeof CarouselContent
  Item: typeof CarouselItem
  Previous: typeof CarouselPrevious
  Next: typeof CarouselNext
  PlayPause: typeof CarouselPlayPause
  Dots: typeof CarouselDots
}

Carousel.Root = CarouselRoot
Carousel.Header = CarouselHeader
Carousel.Title = CarouselTitle
Carousel.TitleLink = CarouselTitleLink
Carousel.Controls = CarouselControls
Carousel.Content = CarouselContent
Carousel.Item = CarouselItem
Carousel.Previous = CarouselPrevious
Carousel.Next = CarouselNext
Carousel.PlayPause = CarouselPlayPause
Carousel.Dots = CarouselDots

export { Carousel }
export type { CarouselRootProps as CarouselProps } from './CarouselRoot'
export type { CarouselHeaderProps } from './CarouselHeader'
export type { CarouselTitleProps } from './CarouselTitle'
export type { CarouselTitleLinkProps } from './CarouselTitleLink'
export type { CarouselControlsProps } from './CarouselControls'
export type { CarouselContentProps } from './CarouselContent'
export type { CarouselItemProps } from './CarouselItem'
export type { CarouselNavButtonProps } from './CarouselPrevious'
export type { CarouselDotsProps } from './CarouselDots'
export type { CarouselContentOverflow } from './variants'
export type {
  CarouselState,
  CarouselActions,
  UseCarouselReturn
} from './CarouselContext'
export {
  carouselContentVariants,
  carouselContainerVariants,
  carouselItemVariants,
  carouselDotsVariants
} from './variants'
export { useCarousel, useCarouselUnsafeEmbla } from './useCarousel'
