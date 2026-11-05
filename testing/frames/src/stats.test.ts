import { describe, expect, it } from 'vitest'

import {
  budgetMisses,
  defaultBudget,
  missExcuse,
  summariseFrames
} from './stats'

const smooth = (count: number) => Array.from({ length: count }, () => 16.7)

describe('summariseFrames', () => {
  it.each([
    ['no frames', [], { frames: 0, p95: 0, worst: 0, dropped: 0 }],
    ['smooth frames', smooth(100), { p50: 16.7, p95: 16.7, dropped: 0 }],
    [
      'one frame that took three vsyncs',
      [...smooth(99), 50],
      { p95: 16.7, worst: 50, dropped: 2, droppedShare: 0.02 }
    ],
    [
      'every frame twice as long',
      Array.from({ length: 60 }, () => 33.3),
      { p50: 33.3, dropped: 60, droppedShare: 0.5 }
    ],
    [
      'frames a little late, which drop nothing',
      Array.from({ length: 60 }, () => 24),
      { p95: 24, dropped: 0 }
    ]
  ])('reads %s', (_, deltas, expected) => {
    expect(summariseFrames(deltas)).toMatchObject(expected)
  })
})

describe('budgetMisses', () => {
  const chromium = defaultBudget('chromium')
  const run = (deltas: number[], longestTask: number | null = null) => ({
    ...summariseFrames(deltas),
    longestTask
  })

  it('passes a smooth run', () => {
    expect(budgetMisses(run(smooth(120)), chromium)).toEqual([])
  })

  it('passes a run with one hitch among many frames', () => {
    expect(budgetMisses(run([...smooth(119), 66.7]), chromium)).toEqual([])
  })

  it('fails a run whose p95 frame is slow', () => {
    const deltas = [...smooth(100), ...Array.from({ length: 20 }, () => 22)]
    expect(budgetMisses(run(deltas), chromium)).toEqual([
      'p95 22ms is over 17.5ms'
    ])
  })

  it('fails a run that drops too many frames', () => {
    const deltas = [...smooth(193), ...Array.from({ length: 7 }, () => 50)]
    expect(budgetMisses(run(deltas), chromium)).toEqual([
      '5.7% of frames dropped, over 5%'
    ])
  })

  it('passes a short run with one hitch, which noise alone can cause', () => {
    expect(budgetMisses(run([...smooth(59), 83.3]), chromium)).toEqual([])
  })

  it('fails a short run with two hitches', () => {
    expect(budgetMisses(run([...smooth(58), 83.3, 83.3]), chromium)).toEqual([
      '6.3% of frames dropped, over 5%'
    ])
  })

  it('fails a run too short to judge', () => {
    expect(budgetMisses(run(smooth(30)), chromium)).toEqual([
      'only 30 frames, fewer than 60'
    ])
  })

  it('checks long tasks only when the budget sets a limit', () => {
    expect(budgetMisses(run(smooth(120), 80), chromium)).toEqual([])
    expect(
      budgetMisses(run(smooth(120), 80), { ...chromium, longestTask: 50 })
    ).toEqual(['a 80ms long task, over 50ms'])
  })

  it('gives engines with a whole-millisecond clock more room', () => {
    const deltas = Array.from({ length: 120 }, (_, i) => (i % 3 ? 16 : 18))
    expect(budgetMisses(run(deltas), chromium)).toEqual([
      'p95 18ms is over 17.5ms'
    ])
    expect(budgetMisses(run(deltas), defaultBudget('webkit'))).toEqual([])
  })
})

describe('missExcuse', () => {
  const reason = 'backdrop blur kept by design'

  it.each([
    ['an exception', { exception: reason }, reason],
    ['a known miss', { knownMiss: 'INNO-9999' }, 'INNO-9999']
  ])('excuses %s over enough frames', (_, marks, expected) => {
    expect(missExcuse(60, marks)).toBe(expected)
  })

  it('names the exception over a known miss', () => {
    expect(missExcuse(60, { knownMiss: 'INNO-9999', exception: reason })).toBe(
      reason
    )
  })

  it('excuses nothing in a run too short to judge', () => {
    expect(missExcuse(59, { exception: reason })).toBeUndefined()
    expect(missExcuse(59, { knownMiss: 'INNO-9999' })).toBeUndefined()
  })

  it('falls back to a known miss when the exception is empty', () => {
    expect(missExcuse(60, { knownMiss: 'INNO-9999', exception: '' })).toBe(
      'INNO-9999'
    )
  })

  it('excuses nothing that gives no reason', () => {
    expect(missExcuse(120, {})).toBeUndefined()
  })
})
