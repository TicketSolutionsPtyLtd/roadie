'use client'

import { useEffect, useRef } from 'react'

import { useReducedMotion } from 'motion/react'

/**
 * Fires `onBounce` when `count` increases between renders. Skips the first
 * meaningful value (undefined → n) to avoid a bounce on initial cart load.
 * Skips entirely when the user prefers reduced motion.
 */
export function useCartBounce(
  count: number | undefined,
  onBounce: () => void
): void {
  const prevRef = useRef<number | undefined>(count)
  const reducedMotion = useReducedMotion() ?? false

  useEffect(() => {
    if (reducedMotion) {
      prevRef.current = count
      return
    }
    const prev = prevRef.current
    if (count !== undefined && prev !== undefined && count > prev) {
      onBounce()
    }
    prevRef.current = count
  }, [count, onBounce, reducedMotion])
}
