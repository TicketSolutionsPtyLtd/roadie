import { describe, expect, it } from 'vitest'

import {
  PRIMARY_METRICS,
  fitPrimaryCluster,
  foldThresholds
} from './primaryCapacity'
import {
  navigatorCapsuleClass,
  navigatorPrimaryClusterContentClass,
  navigatorPrimaryClusterTrackClass
} from './variants'

const s = (
  value: string,
  priority: 'low' | 'automatic' | 'high' = 'automatic'
) => ({ value, priority })
const folded = (result: { folded: Set<string> }) => [...result.folded].sort()
const classesOf = (classes: string) => classes.split(' ')
const five = () => [{ key: 'r', slots: 'abcde'.split('').map((v) => s(v)) }]

describe('vertical navigation arithmetic', () => {
  it('folds nothing when everything fits', () => {
    expect(folded(fitPrimaryCluster(five(), 17.5))).toEqual([])
  })

  it('folds two, not one, when the More tile costs more than a tile saves', () => {
    expect(folded(fitPrimaryCluster(five(), 17.4))).toEqual(['d', 'e'])
  })

  it('folds lowest rank first, across capsules', () => {
    expect(
      folded(
        fitPrimaryCluster(
          [
            { key: 'g1', slots: [s('a'), s('b')] },
            { key: 'g2', slots: [s('c'), s('d'), s('e', 'low')] }
          ],
          18
        )
      )
    ).toEqual(['d', 'e'])
  })

  it('keeps a high-priority item even when it is last', () => {
    expect(
      folded(
        fitPrimaryCluster(
          [{ key: 'r', slots: [s('a'), s('b'), s('c', 'high')] }],
          10.5
        )
      )
    ).toEqual(['a', 'b'])
  })

  it('names the height each item needs to stay, and More to go', () => {
    const { slots, all } = foldThresholds(five())
    expect(Object.fromEntries(slots)).toEqual({
      a: 8.75,
      b: 12,
      c: 15.25,
      d: 17.5,
      e: 17.5
    })
    expect(all).toBe(17.5)
  })

  it.each([
    ['one run', five()],
    [
      'two capsules with priorities',
      [
        { key: 'g1', slots: [s('a'), s('b', 'low')] },
        { key: 'g2', slots: [s('c', 'high'), s('d'), s('e', 'low')] }
      ]
    ]
  ])('folds by threshold exactly as by fitting, for %s', (_, capsules) => {
    const { slots, all } = foldThresholds(capsules)
    for (let height = 0.25; height <= 30; height += 0.25) {
      const byThreshold = [...slots]
        .filter(([, needs]) => height < needs)
        .map(([value]) => value)
        .sort()
      expect([height, byThreshold]).toEqual([
        height,
        folded(fitPrimaryCluster(capsules, height))
      ])
      expect([height, height < all]).toEqual([height, byThreshold.length > 0])
    }
  })

  it('matches the classes that draw the vertical navigation', () => {
    expect(PRIMARY_METRICS).toEqual({
      tile: 3,
      tileGap: 0.25,
      capsulePad: 0.25,
      capsuleGap: 0.75,
      clusterPad: 0.5,
      toggleRow: 3
    })
    expect(classesOf(navigatorCapsuleClass)).toEqual(
      expect.arrayContaining(['p-1', 'gap-1'])
    )
    expect(classesOf(navigatorPrimaryClusterContentClass)).toContain('py-2')
    expect(classesOf(navigatorPrimaryClusterTrackClass)).toContain('gap-3')
  })
})
