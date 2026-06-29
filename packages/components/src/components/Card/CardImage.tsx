import { cn } from '@oztix/roadie-core/utils'

import { Image, type ImageProps } from '../Image'

export type CardImageProps = ImageProps

export function CardImage({ className, ...props }: CardImageProps) {
  return (
    <div data-slot='card-image' className='overflow-hidden rounded-xl'>
      <Image
        className={cn(
          'aspect-2/1 w-full object-cover transition-transform duration-300 group-hover/card:scale-105',
          className
        )}
        {...props}
      />
    </div>
  )
}

CardImage.displayName = 'Card.Image'
