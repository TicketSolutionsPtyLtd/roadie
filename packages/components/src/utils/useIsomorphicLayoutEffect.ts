import { useEffect, useLayoutEffect } from 'react'

// `useLayoutEffect` warns when React renders on the server; several compounds
// are authored in client components but their barrel is imported from RSC
// files, so `window` is the only reliable server/client signal here.
export const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect
