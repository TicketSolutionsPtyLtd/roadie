import { useSyncExternalStore } from 'react'

export type KeyPlatform = 'apple' | 'other'

type NavigatorWithUAData = Navigator & {
  userAgentData?: { platform?: string }
}

const APPLE = /mac|iphone|ipad|ipod/i

function currentPlatform(): KeyPlatform {
  const nav = navigator as NavigatorWithUAData
  const platform = nav.userAgentData?.platform || nav.platform || nav.userAgent
  return APPLE.test(platform) ? 'apple' : 'other'
}

/** `currentPlatform`, as a script that marks the Kbd before it. */
export const markPlatform = `var n=navigator,p=n.userAgentData&&n.userAgentData.platform||n.platform||n.userAgent;e.setAttribute('data-keyboard',${APPLE}.test(p)?'apple':'other')`

const subscribe = () => () => {}

// The server can't know the reader's keyboard, so it and hydration render
// both faces, and `markPlatform` or the client picks one.
export function useKeyPlatform(): KeyPlatform | null {
  return useSyncExternalStore(subscribe, currentPlatform, () => null)
}
