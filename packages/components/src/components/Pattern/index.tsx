import type { CSSProperties, ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import shapes from './shapes.json'

export type PatternCrop = 'top' | 'bottom' | 'left' | 'right' | 'banner'
export type PatternTone = 'brand-blue' | 'brand-purple' | 'brand-orange'

export type PatternProps = Omit<
  ComponentProps<'svg'>,
  'children' | 'viewBox' | 'preserveAspectRatio'
> & {
  /**
   * Where the pattern sits, and so which edge of the artwork it keeps when it
   * covers the box: `top` and `bottom` for a strip along that edge, `left` and
   * `right` for a panel on that side, and `banner` for a wide hero, centred.
   * @default 'right'
   */
  crop?: 'top' | 'bottom' | 'left' | 'right' | 'banner'
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

// Each crop covers its box with the whole artwork, like `background-size:
// cover`, anchored like `background-position`. Strips and the banner use the
// wide artwork; side panels use its portrait arrangements.
const CROPS: Record<
  PatternCrop,
  { field: keyof typeof shapes; align: string }
> = {
  top: { field: 'banner', align: 'xMidYMin slice' },
  bottom: { field: 'banner', align: 'xMidYMax slice' },
  left: { field: 'left', align: 'xMinYMid slice' },
  right: { field: 'right', align: 'xMaxYMid slice' },
  banner: { field: 'banner', align: 'xMidYMid slice' }
}

export function Pattern({
  crop = 'right',
  tone = 'brand-blue',
  className,
  ...props
}: PatternProps) {
  const { field, align } = CROPS[Object.hasOwn(CROPS, crop) ? crop : 'right']
  const fills = FILLS[Object.hasOwn(FILLS, tone) ? tone : 'brand-blue']
  const shape = shapes[field]
  const [x, y, width, height] = shape.viewBox.split(' ')

  return (
    <svg
      data-slot='pattern'
      viewBox={shape.viewBox}
      preserveAspectRatio={align}
      // Size containment drops the viewBox's aspect ratio, which would
      // otherwise stretch an auto-height grid row to the swirl's height.
      className={cn('block size-full contain-size', className)}
      {...props}
      aria-hidden='true'
      focusable='false'
    >
      <rect x={x} y={y} width={width} height={height} style={fills.ground} />
      {shape.paths.map((d) => (
        <path key={d} d={d} style={fills.line} />
      ))}
    </svg>
  )
}

Pattern.displayName = 'Pattern'
