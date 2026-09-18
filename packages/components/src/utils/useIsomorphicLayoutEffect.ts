import { useEffect, useLayoutEffect } from 'react'

// Barrels are imported from RSC files, so `window` is the only reliable server signal.
export const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect
