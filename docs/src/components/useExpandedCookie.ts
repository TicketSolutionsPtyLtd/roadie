'use client'

import { useCallback, useSyncExternalStore } from 'react'

import {
  NAVIGATOR_EXPANDED_COOKIE,
  serializeNavigatorExpandedCookie
} from '@oztix/roadie-core/navigator'

const listeners = new Set<() => void>()

const read = () =>
  document.cookie.split('; ').includes(`${NAVIGATOR_EXPANDED_COOKIE}=1`)

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useExpandedCookie() {
  const expanded = useSyncExternalStore(subscribe, read, () => false)
  const setExpanded = useCallback((next: boolean) => {
    document.cookie = serializeNavigatorExpandedCookie(next)
    listeners.forEach((listener) => listener())
  }, [])
  return [expanded, setExpanded] as const
}
