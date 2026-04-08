import type { ComponentProps } from 'react'

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
  stroke: { fill: 'none', stroke: 'var(--color-illustration-stroke)' }
}

/** Pre-computed style objects — avoids allocating new objects every render. */
const layerStyles: Record<PathData['layer'], React.CSSProperties> = {
  outline: { fill: layerColors.outline.fill },
  face: { fill: layerColors.face.fill },
  detail: { fill: layerColors.detail.fill },
  shadow: { fill: layerColors.shadow.fill },
  highlight: { fill: layerColors.highlight.fill },
  stroke: {
    fill: 'none',
    stroke: layerColors.stroke.stroke,
    strokeWidth: 0.5,
    strokeLinecap: 'round',
    strokeLinejoin: 'round'
  }
}

const outlineHiddenStyle: React.CSSProperties = {
  ...layerStyles.outline,
  opacity: 0
}

const svgStyle: React.CSSProperties = { fill: 'none' }

export function SpotIllustration({
  illustration,
  outline = false,
  className,
  ref,
  ...props
}: SpotIllustrationProps) {
  const { viewBox = '0 0 48 48', paths } = illustration

  return (
    <svg
      ref={ref}
      xmlns='http://www.w3.org/2000/svg'
      viewBox={viewBox}
      aria-hidden={!props['aria-label']}
      className={cn('size-12', className)}
      style={svgStyle}
      {...props}
    >
      {paths.map((path: PathData, index: number) => (
        <path
          key={index}
          d={path.d}
          data-part={path.layer}
          style={
            path.layer === 'outline' && !outline
              ? outlineHiddenStyle
              : layerStyles[path.layer]
          }
        />
      ))}
    </svg>
  )
}

SpotIllustration.displayName = 'SpotIllustration'
