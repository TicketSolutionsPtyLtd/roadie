import type { TokenEntry } from '@roadie-core/tokens'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  durationTable,
  durations,
  easingCurve,
  easingTable,
  easings,
  overshoot
} from './foundation-scales'

const { tokens } = JSON.parse(
  readFileSync(
    new URL('../../../packages/core/src/tokens/tokens.json', import.meta.url),
    'utf8'
  )
) as { tokens: TokenEntry[] }

const motion = (name: string, group: string, value: string): TokenEntry => ({
  name,
  kind: 'variable',
  family: 'motion',
  group,
  sheet: 'motion.css',
  source: 'roadie',
  value: { light: value }
})

describe('durations', () => {
  it('lists each duration, then the stagger step, with a class only where Tailwind has one', () => {
    expect(
      durations(tokens).map(({ name, className }) => [name, className])
    ).toEqual([
      ['--duration-instant', 'duration-instant'],
      ['--duration-fastest', 'duration-fastest'],
      ['--duration-fast', 'duration-fast'],
      ['--duration-normal', 'duration-normal'],
      ['--duration-moderate', 'duration-moderate'],
      ['--duration-slow', 'duration-slow'],
      ['--duration-slower', 'duration-slower'],
      ['--duration-slowest', 'duration-slowest'],
      ['--duration-ambient', undefined],
      ['--duration-sweep', undefined],
      ['--stagger-base', undefined]
    ])
  })

  it('reads each value from the manifest', () => {
    const fast = durations(tokens).find(
      ({ name }) => name === '--duration-fast'
    )
    expect(fast).toMatchObject({ value: '100ms', ms: 100 })
  })

  it('fails on a duration with no job, so a new token gets one', () => {
    expect(() =>
      durations([motion('--duration-glacial', 'Durations', '5000ms')])
    ).toThrow('No job for --duration-glacial')
  })

  it('writes None for a duration with no class', () => {
    const { head, rows } = durationTable(tokens)
    expect(head).toEqual(['Token', 'Value', 'Class', 'Job'])
    expect(
      rows.find(([name]) => JSON.stringify(name).includes('sweep'))
    ).toEqual([
      [{ code: '--duration-sweep' }],
      '2400ms',
      'None',
      'One pass of the shimmer across loading surfaces'
    ])
  })
})

describe('easingCurve', () => {
  it('samples a cubic-bezier from its start to its end', () => {
    const curve = easingCurve('cubic-bezier(0.4, 0, 0.2, 1)')
    expect(curve[0]).toEqual([0, 0])
    expect(curve.at(-1)).toEqual([1, 1])
  })

  it('spreads linear() stops with no position evenly between their neighbours', () => {
    expect(easingCurve('linear(0, 0.25, 0.5 40%, 0.8, 1)')).toEqual([
      [0, 0],
      [0.2, 0.25],
      [0.4, 0.5],
      [0.7, 0.8],
      [1, 1]
    ])
  })

  it('holds a position that runs backwards at the one before it', () => {
    expect(easingCurve('linear(0, 0.5 60%, 0.7 40%, 1)')).toEqual([
      [0, 0],
      [0.6, 0.5],
      [0.6, 0.7],
      [1, 1]
    ])
  })

  it('fails on an easing it cannot draw', () => {
    expect(() => easingCurve('steps(4)')).toThrow("Can't draw the easing")
  })
})

describe('easings', () => {
  it('measures each spring overshoot from its curve', () => {
    expect(
      Object.fromEntries(
        easings(tokens).map(({ name, overshoot }) => [name, overshoot])
      )
    ).toEqual({
      '--ease-standard': 'None',
      '--ease-enter': 'None',
      '--ease-exit': 'None',
      '--ease-spring': '1.7%',
      '--ease-spring-lively': '9.4%'
    })
  })

  it('gives each easing its ease-* class', () => {
    expect(easings(tokens).map(({ className }) => className)).toEqual([
      'ease-standard',
      'ease-enter',
      'ease-exit',
      'ease-spring',
      'ease-spring-lively'
    ])
  })

  it('reads no overshoot from a curve that stays under its end value', () => {
    expect(
      overshoot([
        [0, 0],
        [0.5, 0.9],
        [1, 1]
      ])
    ).toBe('None')
  })

  it('writes the full value into the table', () => {
    const { head, rows } = easingTable(tokens)
    expect(head).toEqual(['Token', 'Value', 'Class', 'Overshoot', 'Job'])
    expect(rows[0]!.slice(0, 4)).toEqual([
      [{ code: '--ease-standard' }],
      [{ code: 'cubic-bezier(0.4, 0, 0.2, 1)' }],
      [{ code: 'ease-standard' }],
      'None'
    ])
  })
})
