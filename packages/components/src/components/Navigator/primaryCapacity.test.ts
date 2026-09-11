import { describe, expect, it } from 'vitest'

import {
  PRIMARY_METRICS,
  capsuleHeight,
  clusterHeight,
  fitPrimaryCluster
} from './primaryCapacity'
import {
  navigatorCapsuleVariants,
  navigatorItemVariants,
  navigatorPrimaryClusterContentVariants
} from './variants'

const s = (
  value: string,
  priority: 'low' | 'automatic' | 'high' = 'automatic'
) => ({ value, priority })
const folded = (result: { folded: Set<string> }) => [...result.folded].sort()
const classesOf = (classes: string) => classes.split(' ')
const five = () => [{ key: 'r', slots: 'abcde'.split('').map((v) => s(v)) }]

describe('vertical navigation arithmetic', () => {
  it('measures capsules and the cluster', () => {
    expect(capsuleHeight(1)).toBe(3.5)
    expect(capsuleHeight(5)).toBe(16.5)
    expect(clusterHeight([2, 3])).toBe(6.75 + 10 + 0.75 + 1)
    expect(clusterHeight([2, 0])).toBe(6.75 + 1)
  })

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

  it('drops an emptied capsule and its gap from the arithmetic', () => {
    expect(
      folded(
        fitPrimaryCluster(
          [
            { key: 'g1', slots: [s('a'), s('b'), s('c')] },
            { key: 'g2', slots: [s('d', 'low')] }
          ],
          12
        )
      )
    ).toEqual(['c', 'd'])
  })

  it('counts a fixed capsule it can never fold', () => {
    const capsules = [{ key: 'r', slots: [s('a'), s('b')] }]
    expect(folded(fitPrimaryCluster(capsules, 12, [1]))).toEqual([])
    expect(folded(fitPrimaryCluster(capsules, 11.9, [1]))).toEqual(['a', 'b'])
  })

  it('folds nothing while unmeasured', () => {
    expect(
      folded(fitPrimaryCluster([{ key: 'r', slots: [s('a')] }], 0))
    ).toEqual([])
  })

  it('matches the classes that draw the vertical navigation', () => {
    expect(PRIMARY_METRICS).toEqual({
      tile: 3,
      tileGap: 0.25,
      capsulePad: 0.25,
      capsuleGap: 0.75,
      clusterPad: 0.5
    })
    expect(classesOf(navigatorItemVariants())).toContain('size-12')
    expect(classesOf(navigatorCapsuleVariants())).toEqual(
      expect.arrayContaining(['p-1', 'gap-1'])
    )
    expect(classesOf(navigatorPrimaryClusterContentVariants())).toEqual(
      expect.arrayContaining(['gap-3', 'py-2'])
    )
  })
})
