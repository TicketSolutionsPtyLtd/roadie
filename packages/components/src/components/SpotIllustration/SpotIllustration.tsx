import { forwardRef, type ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

interface PathData {
  d: string
  layer: 'outline' | 'face' | 'detail' | 'shadow' | 'highlight' | 'stroke'
}

interface IllustrationData {
  viewBox: string
  paths: PathData[]
}

export interface SpotIllustrationProps
  extends Omit<ComponentProps<'svg'>, 'outline'> {
  illustration: IllustrationData
  outline?: boolean
}

export const SpotIllustration = forwardRef<
  SVGSVGElement,
  SpotIllustrationProps
>(({ illustration, outline = false, className, ...props }, ref) => {
  const { viewBox = '0 0 48 48', paths } = illustration

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      className={cn('size-12 fill-none', className)}
      {...props}
    >
      {paths.map((path: PathData, index: number) => (
        <path
          key={index}
          d={path.d}
          data-part={path.layer}
          className={cn(
            path.layer === 'outline' && [
              'fill-neutral-12',
              !outline && 'opacity-0',
            ],
            path.layer === 'face' && 'fill-neutral-3',
            path.layer === 'detail' && 'fill-neutral-9',
            path.layer === 'shadow' && 'fill-neutral-6',
            path.layer === 'highlight' && 'fill-neutral-1',
            path.layer === 'stroke' &&
              'fill-none stroke-neutral-11 [stroke-width:0.5] [stroke-linecap:round] [stroke-linejoin:round]'
          )}
        />
      ))}
    </svg>
  )
})

SpotIllustration.displayName = 'SpotIllustration'
