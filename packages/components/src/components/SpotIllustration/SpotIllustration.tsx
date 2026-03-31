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

/**
 * Illustration colors reference CSS tokens defined in tokens.css.
 * These are fixed and do NOT change in dark mode.
 */
const layerColors: Record<
  PathData['layer'],
  { fill?: string; stroke?: string }
> = {
  outline: { fill: 'var(--color-illustration-outline)' },
  face: { fill: 'var(--color-illustration-face)' },
  detail: { fill: 'var(--color-illustration-detail)' },
  shadow: { fill: 'var(--color-illustration-shadow)' },
  highlight: { fill: 'var(--color-illustration-highlight)' },
  stroke: { fill: 'none', stroke: 'var(--color-illustration-stroke)' },
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
      className={cn('size-12', className)}
      style={{ fill: 'none' }}
      {...props}
    >
      {paths.map((path: PathData, index: number) => {
        const colors = layerColors[path.layer]
        return (
          <path
            key={index}
            d={path.d}
            data-part={path.layer}
            style={{
              fill: colors.fill,
              stroke: colors.stroke,
              strokeWidth: path.layer === 'stroke' ? 0.5 : undefined,
              strokeLinecap: path.layer === 'stroke' ? 'round' : undefined,
              strokeLinejoin: path.layer === 'stroke' ? 'round' : undefined,
              opacity: path.layer === 'outline' && !outline ? 0 : undefined,
            }}
          />
        )
      })}
    </svg>
  )
})

SpotIllustration.displayName = 'SpotIllustration'
