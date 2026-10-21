import { useEffect, useState } from 'react'

import type { brushX } from '@tanstack/charts/interaction/brush'

// d3-brush roughly doubles a chart's bundle, so only a chart that can select
// a range loads it.
export function useBrushX(enabled: boolean) {
  const [create, setCreate] = useState<typeof brushX | null>(null)
  useEffect(() => {
    if (!enabled || create) return
    let live = true
    void import('@tanstack/charts/interaction/brush').then((module) => {
      if (live) setCreate(() => module.brushX)
    })
    return () => {
      live = false
    }
  }, [enabled, create])
  return enabled ? create : null
}
