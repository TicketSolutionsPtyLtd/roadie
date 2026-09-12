'use client'

import { type RefObject, useEffect, useMemo, useState } from 'react'

import { type PrimaryCapsule, fitPrimaryCluster } from './primaryCapacity'

const NONE: ReadonlySet<string> = new Set()

const rootFontSize = () =>
  parseFloat(getComputedStyle(document.documentElement).fontSize) || 16

/** One observer on the cluster's viewport; everything else is arithmetic. */
export function usePrimaryCapacity(
  viewportRef: RefObject<HTMLElement | null>,
  capsules: PrimaryCapsule[],
  enabled: boolean
): { folded: ReadonlySet<string>; shown: boolean } {
  const [available, setAvailable] = useState(0)

  useEffect(() => {
    const node = viewportRef.current
    if (!node || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setAvailable(entry.contentRect.height / rootFontSize())
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [viewportRef])

  // `capsules` is rebuilt every render; this string is its identity.
  const shape = capsules
    .map(
      (capsule) =>
        `${capsule.key}:${capsule.slots.map((slot) => `${slot.value}/${slot.priority}`).join(',')}`
    )
    .join('|')

  const folded = useMemo(
    () => (enabled ? fitPrimaryCluster(capsules, available).folded : NONE),
    [shape, available, enabled]
  )
  // A hidden viewport measures zero.
  return { folded, shown: available > 0 }
}
