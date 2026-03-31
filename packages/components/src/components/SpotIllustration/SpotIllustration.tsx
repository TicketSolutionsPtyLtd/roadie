/* Tailwind safelist: fill-neutral-0 fill-info-5 fill-brand-secondary-5 fill-brand-9 fill-brand-5 fill-neutral-12 stroke-neutral-12 fill-none opacity-0 */
import { type ComponentProps, forwardRef } from 'react'

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
      xmlns='http://www.w3.org/2000/svg'
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
              'fill-neutral-0',
              !outline && 'opacity-0',
            ],
            path.layer === 'face' && 'fill-info-5',
            path.layer === 'detail' && 'fill-brand-secondary-5',
            path.layer === 'shadow' && 'fill-brand-9',
            path.layer === 'highlight' && 'fill-brand-5',
            path.layer === 'stroke' &&
              'fill-none stroke-neutral-12 [stroke-width:0.5] [stroke-linecap:round] [stroke-linejoin:round]',
          )}
        />
      ))}
    </svg>
  )
})

SpotIllustration.displayName = 'SpotIllustration'
