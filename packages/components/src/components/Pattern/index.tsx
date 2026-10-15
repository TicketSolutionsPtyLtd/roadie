import type { CSSProperties, ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import shapes from './shapes.json'

export type PatternCrop = 'top' | 'bottom' | 'left' | 'right' | 'banner'
export type PatternTone = 'brand-blue' | 'brand-purple' | 'brand-orange'

export type PatternProps = Omit<ComponentProps<'div'>, 'children'> & {
  /**
   * Where the pattern sits, and so which edge of the artwork it lines up
   * with: `top` and `bottom` for a strip along that edge, `left` and `right`
   * for a panel on that side, and `banner` for a wide hero, centred.
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

// The swirls are drawn at no less than this many pixels per artwork unit,
// about half the density of a hero banner on a desktop page, so a small box
// shows comfortable rings rather than hairlines.
const DENSITY = 0.3

// Each crop shows the artwork's safe area, the part its swirls fill out to
// every side, so no box ever shows the artwork's outer edge. The area covers
// the box like `background-size: cover`, or more at the density floor, and is
// anchored like `background-position`. Strips and the banner use the wide
// artwork; side panels use its portrait arrangements.
const CROPS: Record<
  PatternCrop,
  { field: keyof typeof shapes; anchor: string }
> = {
  top: { field: 'banner', anchor: 'top-0 left-1/2 -translate-x-1/2' },
  bottom: { field: 'banner', anchor: 'bottom-0 left-1/2 -translate-x-1/2' },
  left: { field: 'left', anchor: 'left-0 top-1/2 -translate-y-1/2' },
  right: { field: 'right', anchor: 'right-0 top-1/2 -translate-y-1/2' },
  banner: { field: 'banner', anchor: 'top-1/2 left-1/2 -translate-1/2' }
}

const SIZES = Object.fromEntries(
  Object.entries(shapes).map(([field, { safe }]) => {
    const [, , width = 0, height = 1] = safe.split(' ').map(Number)
    return [
      field,
      {
        width: `max(100cqw, ${width / height} * 100cqh, ${width * DENSITY}px)`,
        aspectRatio: `${width} / ${height}`
      }
    ]
  })
) as Record<keyof typeof shapes, CSSProperties>

export function Pattern({
  crop = 'right',
  tone = 'brand-blue',
  className,
  ...props
}: PatternProps) {
  const { field, anchor } = CROPS[Object.hasOwn(CROPS, crop) ? crop : 'right']
  const fills = FILLS[Object.hasOwn(FILLS, tone) ? tone : 'brand-blue']
  const shape = shapes[field]
  const [x, y, width, height] = shape.safe.split(' ')

  return (
    <div
      data-slot='pattern'
      // The container's size, not its content, sets the swirls' scale, and
      // size containment keeps an auto-height grid row from growing to fit.
      className={cn(
        '[container-type:size] relative block size-full overflow-hidden',
        className
      )}
      {...props}
      aria-hidden='true'
    >
      <svg
        viewBox={shape.safe}
        focusable='false'
        className={cn('absolute max-w-none', anchor)}
        style={SIZES[field]}
      >
        <rect x={x} y={y} width={width} height={height} style={fills.ground} />
        {shape.paths.map((d) => (
          <path key={d} d={d} style={fills.line} />
        ))}
      </svg>
    </div>
  )
}

Pattern.displayName = 'Pattern'
