'use client'

import { useCallback, useEffect, useState } from 'react'

import { usePathname, useSearchParams } from 'next/navigation'

export const NAV_LIST_PARAM = 'nav'
export const NAV_MORE_PARAM = 'more'

type NavQuery = { nav: boolean; more: boolean }
type Report = (query: NavQuery, pathname: string) => void

/** Reports the nav query flags; render inside a `Suspense` so the page still prerenders. */
export function NavQueryFlags({ onChange }: { onChange: Report }) {
  const params = useSearchParams()
  const pathname = usePathname()
  const nav = params.has(NAV_LIST_PARAM)
  const more = params.has(NAV_MORE_PARAM)
  useEffect(() => {
    onChange({ nav, more }, pathname)
  }, [nav, more, pathname, onChange])
  return null
}

// Keyed by pathname, so a new route reads false before its query is reported.
export function useNavQuery(pathname: string): [NavQuery, Report] {
  const [state, setState] = useState({ pathname: '', nav: false, more: false })
  const report = useCallback<Report>(
    ({ nav, more }, atPathname) =>
      setState((current) =>
        current.pathname === atPathname &&
        current.nav === nav &&
        current.more === more
          ? current
          : { pathname: atPathname, nav, more }
      ),
    []
  )
  const current = state.pathname === pathname
  return [{ nav: current && state.nav, more: current && state.more }, report]
}
