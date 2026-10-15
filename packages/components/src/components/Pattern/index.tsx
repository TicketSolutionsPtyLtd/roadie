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

// The swirls are drawn at no less than this many pixels per artwork unit, so
// a small box shows comfortable rings rather than hairlines. A box too big to
// fill at this density scales the artwork up to cover it.
const DENSITY = 0.2

const [X, Y, W, H] = shapes.safe.split(' ').map(Number) as [
  number,
  number,
  number,
  number
]

// Each crop shows the artwork's safe area, the part its swirls fill out to
// every side, so no box ever shows where the artwork ends. The crop turns the
// artwork so its top edge lies along the edge the pattern sits on, and
// anchors it there, like `background-position`.
const CROPS: Record<
  PatternCrop,
  { transform?: string; viewBox: number[]; anchor: string }
> = {
  top: { viewBox: [X, Y, W, H], anchor: 'top-0 left-1/2 -translate-x-1/2' },
  bottom: {
    transform: 'scale(1 -1)',
    viewBox: [X, -(Y + H), W, H],
    anchor: 'bottom-0 left-1/2 -translate-x-1/2'
  },
  left: {
    transform: 'rotate(-90)',
    viewBox: [Y, -(X + W), H, W],
    anchor: 'left-0 top-1/2 -translate-y-1/2'
  },
  right: {
    transform: 'rotate(90)',
    viewBox: [-(Y + H), X, H, W],
    anchor: 'right-0 top-1/2 -translate-y-1/2'
  },
  banner: { viewBox: [X, Y, W, H], anchor: 'top-1/2 left-1/2 -translate-1/2' }
}

function sizeOf([, , width = 0, height = 1]: number[]): CSSProperties {
  return {
    width: `max(100cqw, ${width / height} * 100cqh, ${width * DENSITY}px)`,
    aspectRatio: `${width} / ${height}`
  }
}

export function Pattern({
  crop = 'right',
  tone = 'brand-blue',
  className,
  ...props
}: PatternProps) {
  const { transform, viewBox, anchor } =
    CROPS[Object.hasOwn(CROPS, crop) ? crop : 'right']
  const fills = FILLS[Object.hasOwn(FILLS, tone) ? tone : 'brand-blue']

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
        viewBox={viewBox.join(' ')}
        focusable='false'
        className={cn('absolute max-w-none', anchor)}
        style={sizeOf(viewBox)}
      >
        <g transform={transform}>
          <rect x={X} y={Y} width={W} height={H} style={fills.ground} />
          {shapes.paths.map((d) => (
            <path key={d} d={d} style={fills.line} />
          ))}
        </g>
      </svg>
    </div>
  )
}

Pattern.displayName = 'Pattern'
