import { useSyncExternalStore } from 'react'

export type KeyPlatform = 'apple' | 'other'

type NavigatorWithUAData = Navigator & {
  userAgentData?: { platform?: string }
}

function currentPlatform(): KeyPlatform {
  const nav = navigator as NavigatorWithUAData
  const platform = nav.userAgentData?.platform || nav.platform || nav.userAgent
  return /mac|iphone|ipad|ipod/i.test(platform) ? 'apple' : 'other'
}

const subscribe = () => () => {}

// The server can't know the reader's keyboard, so it and hydration render
// neither face; the client swaps in the right one straight after.
export function useKeyPlatform(): KeyPlatform | null {
  return useSyncExternalStore(subscribe, currentPlatform, () => null)
}
