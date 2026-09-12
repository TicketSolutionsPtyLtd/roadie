'use client'

import { type RefObject, useEffect, useMemo, useState } from 'react'

import { type PrimaryCapsule, fitPrimaryCluster } from './primaryCapacity'

const NONE: ReadonlySet<string> = new Set()

const rootFontSize = () =>
  parseFloat(getComputedStyle(document.documentElement).fontSize) || 16

type Measured = { viewport: number; brandPadding: number }

/**
 * One observer on the cluster's viewport; everything else is arithmetic.
 * `restingBrandPadding` is the brand region's bottom padding, in rem, once it
 * stops animating: capacity is measured against where the viewport settles,
 * so an expand or collapse folds once rather than frame by frame.
 */
export function usePrimaryCapacity(
  viewportRef: RefObject<HTMLElement | null>,
  brandRef: RefObject<HTMLElement | null>,
  capsules: PrimaryCapsule[],
  restingBrandPadding: number,
  enabled: boolean
): { folded: ReadonlySet<string>; shown: boolean } {
  const [measured, setMeasured] = useState<Measured>({
    viewport: 0,
    brandPadding: 0
  })

  useEffect(() => {
    const node = viewportRef.current
    if (!node || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const rem = rootFontSize()
      const brand = brandRef.current
      const padding = brand
        ? parseFloat(getComputedStyle(brand).paddingBottom) || 0
        : 0
      setMeasured({
        viewport: entry.contentRect.height / rem,
        brandPadding: padding / rem
      })
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [viewportRef, brandRef])

  // `capsules` is rebuilt every render; this string is its identity.
  const shape = capsules
    .map(
      (capsule) =>
        `${capsule.key}:${capsule.slots.map((slot) => `${slot.value}/${slot.priority}`).join(',')}`
    )
    .join('|')

  // A hidden viewport measures zero.
  const shown = measured.viewport > 0
  const available = shown
    ? measured.viewport + measured.brandPadding - restingBrandPadding
    : 0

  const folded = useMemo(
    () => (enabled ? fitPrimaryCluster(capsules, available).folded : NONE),
    [shape, available, enabled]
  )
  return { folded, shown }
}
