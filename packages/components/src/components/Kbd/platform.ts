import { useSyncExternalStore } from 'react'

import { APPLE_PLATFORM } from '../../utils/beforePaint'

export type KeyPlatform = 'apple' | 'other'

type NavigatorWithUAData = Navigator & {
  userAgentData?: { platform?: string }
}

function currentPlatform(): KeyPlatform {
  const nav = navigator as NavigatorWithUAData
  const platform = nav.userAgentData?.platform || nav.platform || nav.userAgent
  return APPLE_PLATFORM.test(platform) ? 'apple' : 'other'
}

const subscribe = () => () => {}

// The server can't know the reader's keyboard, so it and hydration render
// both faces, and `BeforePaint` or the client picks one.
export function useKeyPlatform(): KeyPlatform | null {
  return useSyncExternalStore(subscribe, currentPlatform, () => null)
}
