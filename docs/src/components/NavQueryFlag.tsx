'use client'

import { useCallback, useEffect, useState } from 'react'

import { useSearchParams } from 'next/navigation'

import { useRoute } from '@/lib/route'

export const NAV_LIST_PARAM = 'nav'
export const NAV_MORE_PARAM = 'more'

type NavQuery = { nav: boolean; more: boolean }
type Report = (query: NavQuery, route: string) => void

/** Reports the nav query flags; render inside a `Suspense` so the page still prerenders. */
export function NavQueryFlags({ onChange }: { onChange: Report }) {
  const params = useSearchParams()
  const route = useRoute()
  const nav = params.has(NAV_LIST_PARAM)
  const more = params.has(NAV_MORE_PARAM)
  useEffect(() => {
    onChange({ nav, more }, route)
  }, [nav, more, route, onChange])
  return null
}

// Keyed by route, so a new route reads false before its query is reported.
export function useNavQuery(route: string): [NavQuery, Report] {
  const [state, setState] = useState({ route: '', nav: false, more: false })
  const report = useCallback<Report>(
    ({ nav, more }, atRoute) =>
      setState((current) =>
        current.route === atRoute &&
        current.nav === nav &&
        current.more === more
          ? current
          : { route: atRoute, nav, more }
      ),
    []
  )
  const current = state.route === route
  return [{ nav: current && state.nav, more: current && state.more }, report]
}
