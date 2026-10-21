import { describe, expect, it } from 'vitest'

import { OTHER } from '../plot/series'
import { stackLayers, stackOrder } from './stack'
import type { StackedAreaProps } from './types'

const rows = (values: Record<string, number[]>): StackedAreaProps['data'] =>
  Object.entries(values).flatMap(([gate, counts]) =>
    counts.map((scans, i) => ({ at: i, gate, scans }))
  )

const props = (values: Record<string, number[]>): StackedAreaProps => ({
  data: rows(values),
  x: 'at',
  y: 'scans',
  series: 'gate'
})

describe('stackOrder', () => {
  it('puts the largest total at the bottom', () => {
    expect(
      stackOrder(props({ VIP: [1, 1], Main: [9, 9], North: [3, 4] }))
    ).toEqual(['Main', 'North', 'VIP'])
  })

  it('rolls past 6 into Other, on top', () => {
    const many = Object.fromEntries(
      Array.from({ length: 8 }, (_, i) => [`Gate ${i + 1}`, [10 - i, 10 - i]])
    )
    const order = stackOrder(props(many))
    expect(order).toHaveLength(6)
    expect(order.at(-1)).toBe(OTHER)
    expect(order[0]).toBe('Gate 1')
  })
})

describe('stackLayers', () => {
  it('stacks each time from zero in stack order', () => {
    const layers = stackLayers(props({ VIP: [1, 2], Main: [5, 6] }))
    expect(layers.filter((l) => l.x === 0)).toMatchObject([
      { series: 'Main', y: 5, start: 0, end: 5 },
      { series: 'VIP', y: 1, start: 5, end: 6 }
    ])
  })

  it('fills a missing reading with zero so the layers stay joined', () => {
    const layers = stackLayers({
      ...props({ Main: [5, 6] }),
      data: [...rows({ Main: [5, 6] }), { at: 1, gate: 'VIP', scans: 2 }]
    })
    expect(layers.find((l) => l.x === 0 && l.series === 'VIP')).toMatchObject({
      y: 0,
      start: 5,
      end: 5
    })
  })

  it('adds up repeated rows for the same time and series', () => {
    const layers = stackLayers({
      ...props({ Main: [5] }),
      data: [...rows({ Main: [5] }), { at: 0, gate: 'Main', scans: 2 }]
    })
    expect(layers).toMatchObject([{ series: 'Main', y: 7, end: 7 }])
  })
})
