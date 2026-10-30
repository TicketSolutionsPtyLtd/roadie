import { describe, expect, it, vi } from 'vitest'

import { OTHER } from '../plot/series'
import { donutParts } from './parts'
import type { DonutChartProps } from './types'

const donut = (
  values: readonly (number | string | null)[]
): DonutChartProps => ({
  data: values.map((sold, i) => ({ type: `Type ${i + 1}`, sold })),
  x: 'type',
  y: 'sold'
})

const names = (props: DonutChartProps) => donutParts(props).map((p) => p.name)
const percents = (props: DonutChartProps) =>
  donutParts(props).map((p) => p.percent)

describe('donutParts', () => {
  it('orders parts largest first', () => {
    expect(names(donut([20, 50, 30]))).toEqual(['Type 2', 'Type 3', 'Type 1'])
  })

  it('keeps five parts without an Other', () => {
    expect(names(donut([50, 40, 30, 20, 10]))).toEqual([
      'Type 1',
      'Type 2',
      'Type 3',
      'Type 4',
      'Type 5'
    ])
  })

  it('rolls the smallest into Other, placed last, past five parts', () => {
    const parts = donutParts(donut([5, 60, 50, 40, 30, 20]))
    expect(parts.map((p) => p.name)).toEqual([
      'Type 2',
      'Type 3',
      'Type 4',
      'Type 5',
      OTHER
    ])
    expect(parts.at(-1)).toMatchObject({ value: 25, isOther: true })
  })

  it('places a part named Other last, as Other', () => {
    const parts = donutParts({
      data: [
        { type: 'Other', sold: 50 },
        { type: 'GA', sold: 30 },
        { type: 'VIP', sold: 20 }
      ],
      x: 'type',
      y: 'sold'
    })
    expect(parts.map((p) => [p.name, p.isOther])).toEqual([
      ['GA', false],
      ['VIP', false],
      [OTHER, true]
    ])
  })

  it('folds a part named Other into the rolled Other', () => {
    const parts = donutParts({
      data: [60, 50, 40, 30, 20, 10]
        .map((sold, i) => ({ type: `Type ${i + 1}`, sold }))
        .concat({ type: 'Other', sold: 45 }),
      x: 'type',
      y: 'sold'
    })
    expect(parts.map((p) => p.name)).toEqual([
      'Type 1',
      'Type 2',
      'Type 3',
      'Type 4',
      OTHER
    ])
    expect(parts.at(-1)!.value).toBe(20 + 10 + 45)
  })

  it.each([
    ['thirds', [1, 1, 1], [34, 33, 33]],
    ['halves', [1, 1], [50, 50]],
    ['uneven', [52, 26, 11, 7, 4], [52, 26, 11, 7, 4]],
    ['remainders', [1240, 520, 310, 220, 95], [52, 22, 13, 9, 4]],
    ['sevenths', [1, 1, 1, 1, 1, 1, 1], [15, 14, 14, 14, 43]]
  ])('rounds %s to whole percents that add up to 100', (_, values, want) => {
    expect(percents(donut(values))).toEqual(want)
  })

  it('drops the label of a part under 3%', () => {
    const parts = donutParts(donut([95, 2.9, 2.1]))
    expect(parts.map((p) => p.labelled)).toEqual([true, false, false])
  })

  it('labels a part at exactly 3%', () => {
    expect(donutParts(donut([97, 3])).map((p) => p.labelled)).toEqual([
      true,
      true
    ])
  })

  it('gives each part its share of the total', () => {
    const [first, second] = donutParts(donut([75, 25]))
    expect(first!.share).toBe(0.75)
    expect(second!.share).toBe(0.25)
  })

  it('leaves out missing, zero, negative and text values', () => {
    expect(names(donut([40, null, 0, -10, 'many', 60]))).toEqual([
      'Type 6',
      'Type 1'
    ])
  })

  it('warns in development about a part it leaves out', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    donutParts({
      data: [
        { kind: 'Refunds', amount: -40 },
        { kind: 'Sales', amount: 90 }
      ],
      x: 'kind',
      y: 'amount'
    })
    expect(warn).toHaveBeenCalledWith(
      'Roadie chart: the donut leaves out a "Refunds" row, since its amount isn\'t a positive number'
    )
    warn.mockRestore()
  })

  it('leaves out an infinite value', () => {
    expect(names(donut([40, Infinity, 60]))).toEqual(['Type 3', 'Type 1'])
  })

  it('warns once about a part it leaves out, and not about a zero', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const props = {
      data: [
        { kind: 'Comps', amount: 0 },
        { kind: 'Chargebacks', amount: -5 },
        { kind: 'Sales', amount: 90 }
      ],
      x: 'kind',
      y: 'amount'
    }
    donutParts(props)
    donutParts(props)
    expect(warn.mock.calls).toEqual([
      [
        'Roadie chart: the donut leaves out a "Chargebacks" row, since its amount isn\'t a positive number'
      ]
    ])
    warn.mockRestore()
  })

  it('leaves out rows with no name', () => {
    const parts = donutParts({
      data: [
        { type: null, sold: 10 },
        { type: '', sold: 10 },
        { type: 'GA', sold: 10 }
      ],
      x: 'type',
      y: 'sold'
    })
    expect(parts.map((p) => p.name)).toEqual(['GA'])
  })

  it('adds up rows that share a name', () => {
    const parts = donutParts({
      data: [
        { type: 'GA', sold: 10 },
        { type: 'VIP', sold: 15 },
        { type: 'GA', sold: 10 }
      ],
      x: 'type',
      y: 'sold'
    })
    expect(parts.map((p) => [p.name, p.value])).toEqual([
      ['GA', 20],
      ['VIP', 15]
    ])
  })

  it('has no parts with no positive values', () => {
    expect(donutParts(donut([0, -5, null]))).toEqual([])
  })
})
