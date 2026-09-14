'use client'

import { type RefObject, useEffect, useMemo, useState } from 'react'

import { type PrimaryCapsule, fitPrimaryCluster } from './primaryCapacity'
import { holdDuringLayoutTransitions } from './transitionHold'

const NONE: ReadonlySet<string> = new Set()

type Measured = { viewport: number; brandPadding: number }

// Half-pixel steps in rem, so sub-pixel jitter never republishes.
const quantize = (px: number, rem: number) => Math.round(px * 2) / 2 / rem

const sameMembers = (a: ReadonlySet<string>, b: ReadonlySet<string>) =>
  a.size === b.size && [...a].every((value) => b.has(value))

/**
 * One observer on the cluster's viewport; everything else is arithmetic.
 * `restingBrandPadding` is the brand region's bottom padding, in rem, once it
 * stops animating: capacity is measured against where the viewport settles,
 * so an expand or collapse folds once rather than frame by frame. Pass
 * `capsules` memoised, or the fit reruns every render.
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
    const rem =
      parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
    let height = 0
    const publish = () => {
      const brand = brandRef.current
      const padding = brand
        ? parseFloat(getComputedStyle(brand).paddingBottom) || 0
        : 0
      const next = {
        viewport: quantize(height, rem),
        brandPadding: quantize(padding, rem)
      }
      setMeasured((current) =>
        current.viewport === next.viewport &&
        current.brandPadding === next.brandPadding
          ? current
          : next
      )
    }
    // An expand or collapse resizes the viewport every frame; only where it lands counts.
    const hold = holdDuringLayoutTransitions(
      node.closest('[data-slot="navigator-primary"]') ?? node,
      publish
    )
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      height = entry.contentRect.height
      hold.schedule()
    })
    observer.observe(node)
    return () => {
      observer.disconnect()
      hold.dispose()
    }
  }, [viewportRef, brandRef])

  // A hidden viewport measures zero.
  const shown = measured.viewport > 0
  const available = shown
    ? measured.viewport + measured.brandPadding - restingBrandPadding
    : 0

  const fitted = useMemo(
    () => (enabled ? fitPrimaryCluster(capsules, available).folded : NONE),
    [capsules, available, enabled]
  )
  // The previous set while its members hold, so a new height alone re-renders no Group.
  const [kept, setKept] = useState(fitted)
  const unchanged = sameMembers(kept, fitted)
  if (!unchanged) setKept(fitted)
  return { folded: unchanged ? kept : fitted, shown }
}
