import type { CSSProperties, ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import shapes from './shapes.json'

export type PatternCrop = 'top' | 'left' | 'right' | 'banner'
export type PatternTone = 'brand-blue' | 'brand-purple' | 'brand-orange'

export type PatternProps = Omit<
  ComponentProps<'svg'>,
  'children' | 'viewBox' | 'preserveAspectRatio'
> & {
  /**
   * The crop of the swirl: `top` for a band across the top, `left` and
   * `right` for a panel on that side, and `banner` for a wide hero.
   * @default 'right'
   */
  crop?: 'top' | 'left' | 'right' | 'banner'
  /**
   * The brand colour, fixed in light and dark mode.
   * @default 'brand-blue'
   */
  tone?: 'brand-blue' | 'brand-purple' | 'brand-orange'
}

const SCALE: Record<PatternTone, string> = {
  'brand-blue': 'brand',
  'brand-purple': 'info',
  'brand-orange': 'brand-secondary'
}

// Pattern is artwork, so it takes the theme-fixed light steps.
const FILLS = Object.fromEntries(
  Object.entries(SCALE).map(([tone, scale]) => [
    tone,
    {
      ground: { fill: `var(--color-${scale}-light-9)` },
      line: { fill: `var(--color-${scale}-light-5)` }
    }
  ])
) as Record<PatternTone, { ground: CSSProperties; line: CSSProperties }>

// When the box is a different shape from the crop, each keeps the edge its
// swirl was drawn against: a left panel hugs its right edge, a right panel its
// left, and bands stay centred.
const ALIGN: Record<PatternCrop, string> = {
  top: 'xMidYMid slice',
  left: 'xMaxYMid slice',
  right: 'xMinYMid slice',
  banner: 'xMidYMid slice'
}

export function Pattern({
  crop = 'right',
  tone = 'brand-blue',
  className,
  ...props
}: PatternProps) {
  const known = Object.hasOwn(shapes, crop) ? crop : 'right'
  const fills = FILLS[Object.hasOwn(FILLS, tone) ? tone : 'brand-blue']
  const shape = shapes[known]

  return (
    <svg
      data-slot='pattern'
      viewBox={shape.viewBox}
      preserveAspectRatio={ALIGN[known]}
      // Size containment drops the viewBox's aspect ratio, which would
      // otherwise stretch an auto-height grid row to the swirl's height.
      className={cn('block size-full contain-size', className)}
      {...props}
      aria-hidden='true'
      focusable='false'
    >
      <rect x='-50%' y='-50%' width='200%' height='200%' style={fills.ground} />
      {shape.paths.map((d) => (
        <path key={d} d={d} style={fills.line} />
      ))}
    </svg>
  )
}

Pattern.displayName = 'Pattern'
