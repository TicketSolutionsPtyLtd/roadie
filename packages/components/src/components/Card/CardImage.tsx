import { cn } from '@oztix/roadie-core/utils'

import { Image, type ImageProps } from '../Image'

export type CardImageProps = ImageProps

export function CardImage({ className, ...props }: CardImageProps) {
  return (
    <div data-slot='card-image' className='overflow-hidden rounded-xl'>
      {/* The card is the control; its hover zooms the image, which no utility does. */}
      <Image
        className={cn(
          'aspect-2/1 w-full object-cover transition-transform duration-slow group-hover/card:scale-105',
          className
        )}
        {...props}
      />
    </div>
  )
}

CardImage.displayName = 'Card.Image'
