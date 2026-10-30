import type { PlotAnnotation } from '@oztix/roadie-core/dashboard'

import { parseX } from './time'
import { finiteOrNull } from './values'

// Engine-free, so server table derivation can check placement too.
export function xOnAxis(
  at: PlotAnnotation['at'],
  [start, end]: readonly [number, number],
  isTime: boolean
) {
  const x = isTime ? parseX(at) : finiteOrNull(at)
  return x === null || x < start || x > end ? null : x
}

export const isOnAxis = (
  at: PlotAnnotation['at'],
  domain: readonly [number, number],
  isTime: boolean
) => xOnAxis(at, domain, isTime) !== null
