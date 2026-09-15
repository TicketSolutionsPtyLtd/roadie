import { describe, expect, it } from 'vitest'

import { PRIMARY_METRICS, fitPrimaryCluster } from './primaryCapacity'
import {
  navigatorCapsuleVariants,
  navigatorItemVariants,
  navigatorPrimaryBrandVariants,
  navigatorPrimaryClusterContentVariants,
  navigatorPrimaryClusterTrackVariants
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

  it('matches the classes that draw the vertical navigation', () => {
    expect(PRIMARY_METRICS).toEqual({
      tile: 3,
      tileGap: 0.25,
      capsulePad: 0.25,
      capsuleGap: 0.75,
      clusterPad: 0.5,
      toggleRow: 3
    })
    expect(classesOf(navigatorItemVariants())).toContain('h-12')
    expect(classesOf(navigatorCapsuleVariants())).toEqual(
      expect.arrayContaining(['p-1', 'gap-1'])
    )
    expect(classesOf(navigatorPrimaryClusterContentVariants())).toContain(
      'py-2'
    )
    expect(classesOf(navigatorPrimaryClusterTrackVariants())).toContain('gap-3')
    expect(classesOf(navigatorPrimaryBrandVariants({ toggle: true }))).toEqual(
      expect.arrayContaining(['pb-12', 'navigator-expanded:pb-0'])
    )
  })
})
