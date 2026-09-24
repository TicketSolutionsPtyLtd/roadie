import type { ReactElement } from 'react'

export const CHART_TEXTURE_COUNT = 8

export const chartTextureId = (slot: number) => `roadie-texture-${slot}`

const PATTERNS: readonly ReactElement[] = [
  <path key='1' d='M-1 1l2-2M0 6l6-6M5 7l2-2' />,
  <circle key='2' cx={3} cy={3} r={1.1} fill='currentColor' stroke='none' />,
  <path key='3' d='M0 0l6 6M6 0L0 6' />,
  <path key='4' d='M0 3h6' />,
  <path key='5' d='M3 0v6' />,
  <path key='6' d='M0 3h6M3 0v6' />,
  <path key='7' d='M-1 5l2 2M0 0l6 6M5 -1l2 2' />,
  <path key='8' d='M0 4q1.5-3 3 0t3 0' />
]

export function ChartPatterns() {
  return (
    <svg
      aria-hidden
      width={0}
      height={0}
      className='absolute'
      focusable={false}
    >
      <defs>
        {PATTERNS.map((shape, i) => (
          <pattern
            key={chartTextureId(i + 1)}
            id={chartTextureId(i + 1)}
            width={6}
            height={6}
            patternUnits='userSpaceOnUse'
          >
            <g fill='none' stroke='currentColor' strokeWidth={1.2}>
              {shape}
            </g>
          </pattern>
        ))}
      </defs>
    </svg>
  )
}
ChartPatterns.displayName = 'ChartPatterns'
