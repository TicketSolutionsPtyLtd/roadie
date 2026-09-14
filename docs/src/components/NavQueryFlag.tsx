'use client'

import { useCallback, useEffect, useState } from 'react'

import { usePathname, useSearchParams } from 'next/navigation'

export const NAV_LIST_PARAM = 'nav'
export const NAV_MORE_PARAM = 'more'

type Report = (on: boolean, pathname: string) => void

/** Reports whether `name` is in the query; render inside a `Suspense` so the page still prerenders. */
export function NavQueryFlag({
  name,
  onChange
}: {
  name: string
  onChange: Report
}) {
  const on = useSearchParams().has(name)
  const pathname = usePathname()
  useEffect(() => {
    onChange(on, pathname)
  }, [on, pathname, onChange])
  return null
}

// Keyed by pathname, so a new route reads false before its query is reported.
export function useNavQueryFlag(pathname: string): [boolean, Report] {
  const [state, setState] = useState({ pathname: '', on: false })
  const report = useCallback<Report>(
    (on, atPathname) =>
      setState((current) =>
        current.pathname === atPathname && current.on === on
          ? current
          : { pathname: atPathname, on }
      ),
    []
  )
  return [state.on && state.pathname === pathname, report]
}
