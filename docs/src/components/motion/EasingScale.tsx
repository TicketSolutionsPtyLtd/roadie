import { type CurvePoint, easings } from '@/lib/foundation-scales'
import { getTokens } from '@/lib/tokens'

const EDGE = 4
const START = 92
const END = 20

const x = (progress: number) => EDGE + progress * (100 - 2 * EDGE)
const y = (value: number) => START - value * (START - END)

const path = (curve: CurvePoint[]) =>
  curve
    .map(([progress, value], i) => `${i ? 'L' : 'M'}${x(progress)},${y(value)}`)
    .join(' ')

/** Each easing drawn as its curve, with its value, class, overshoot, and job. */
export async function EasingScale() {
  return (
    <ol
      data-not-prose
      data-slot='easing-scale'
      className='grid divide-y divide-subtler'
    >
      {easings(await getTokens()).map(
        ({ name, value, className, curve, overshoot, job }) => (
          <li
            key={name}
            data-slot='easing-row'
            data-twin-row
            className='grid grid-cols-[4rem_minmax(0,1fr)] items-start gap-4 py-3'
          >
            <svg
              data-slot='easing-curve'
              viewBox='0 0 100 100'
              aria-hidden
              className='size-16 rounded-lg emphasis-sunken'
            >
              {/* The end value, so an overshoot shows above it. */}
              <line
                x1={x(0)}
                x2={x(1)}
                y1={y(1)}
                y2={y(1)}
                strokeDasharray='4 4'
                className='stroke-current text-subtler'
              />
              <path
                d={path(curve)}
                strokeWidth={4}
                strokeLinecap='round'
                strokeLinejoin='round'
                className='fill-none stroke-current text-strong intent-brand'
              />
            </svg>
            <div className='grid gap-1'>
              <code data-twin-cell className='font-mono text-sm text-strong'>
                {name}
              </code>
              <code
                data-slot='easing-value'
                data-twin-cell
                className='font-mono text-xs text-subtle'
              >
                {value}
              </code>
              <div className='flex flex-wrap items-baseline gap-x-3'>
                {className ? (
                  <code
                    data-slot='easing-class'
                    data-twin-cell
                    className='font-mono text-sm text-subtle'
                  >
                    {className}
                  </code>
                ) : (
                  <span
                    data-slot='easing-class'
                    data-twin-cell
                    className='text-sm text-subtler'
                  >
                    None
                  </span>
                )}
                <span className='text-sm text-subtle'>
                  Overshoot{' '}
                  <span
                    data-slot='easing-overshoot'
                    data-twin-cell
                    className='tabular-nums'
                  >
                    {overshoot}
                  </span>
                </span>
              </div>
              <span data-twin-cell className='text-sm text-subtle'>
                {job}
              </span>
            </div>
          </li>
        )
      )}
    </ol>
  )
}
