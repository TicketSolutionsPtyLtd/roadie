import type { CSSProperties, ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

/** A spot illustration's layers, each drawn in its own illustration colour. */
export type SpotIllustrationLayer =
  | 'shadow'
  | 'face'
  | 'detail'
  | 'highlight'
  | 'stroke'

/** Path data for each layer, back to front. The stroke layer comes last. */
export type SpotIllustrationLayers = readonly (readonly [
  SpotIllustrationLayer,
  string
])[]

export interface SpotIllustrationProps extends Omit<
  ComponentProps<'svg'>,
  'outline'
> {
  layers: SpotIllustrationLayers
  /** Draws a white sticker outline around the art, for busy or dark backgrounds. */
  outline?: boolean
}

export type SpotIllustrationComponentProps = Omit<
  SpotIllustrationProps,
  'layers'
>

// Each token is named whole: Tailwind emits only the theme variables it finds in scanned source.
const LAYER_STYLES: Record<SpotIllustrationLayer, CSSProperties> = {
  shadow: { fill: 'var(--color-illustration-shadow)', fillRule: 'evenodd' },
  face: { fill: 'var(--color-illustration-face)', fillRule: 'evenodd' },
  detail: { fill: 'var(--color-illustration-detail)', fillRule: 'evenodd' },
  highlight: {
    fill: 'var(--color-illustration-highlight)',
    fillRule: 'evenodd'
  },
  stroke: {
    fill: 'none',
    stroke: 'var(--color-illustration-stroke)',
    strokeWidth: 0.5,
    strokeLinecap: 'round',
    strokeLinejoin: 'round'
  }
}

// Every layer stroked 4 wide is the art grown by 2, which is the box's margin.
const OUTLINE_STYLE: CSSProperties = {
  fill: 'var(--color-illustration-outline)',
  fillRule: 'evenodd',
  stroke: 'var(--color-illustration-outline)',
  strokeWidth: 4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
}

const UNFILLED: CSSProperties = { fill: 'none' }

export function SpotIllustration({
  layers,
  outline = false,
  className,
  ref,
  ...props
}: SpotIllustrationProps) {
  const labelled = Boolean(props['aria-label'] || props['aria-labelledby'])
  return (
    <svg
      ref={ref}
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 48 48'
      fill='none'
      role={labelled ? 'img' : undefined}
      aria-hidden={labelled ? undefined : true}
      className={cn('size-12', className)}
      {...props}
    >
      {outline && (
        <g data-part='outline' style={OUTLINE_STYLE}>
          {layers.map(([layer, d]) => (
            <path
              key={layer}
              d={d}
              style={layer === 'stroke' ? UNFILLED : undefined}
            />
          ))}
        </g>
      )}
      {layers.map(([layer, d]) => (
        <path key={layer} data-part={layer} d={d} style={LAYER_STYLES[layer]} />
      ))}
    </svg>
  )
}

SpotIllustration.displayName = 'SpotIllustration'

/** Binds a spot illustration's layers into a named component. Generated code calls it. */
export function createSpotIllustration(
  name: string,
  layers: SpotIllustrationLayers
) {
  function Illustration(props: SpotIllustrationComponentProps) {
    return <SpotIllustration layers={layers} {...props} />
  }
  Illustration.displayName = name
  return Illustration
}
