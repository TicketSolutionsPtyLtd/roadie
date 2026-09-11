'use client'

import { useEffect } from 'react'

import { usePathname, useSearchParams } from 'next/navigation'

export const NAV_LIST_PARAM = 'nav'

export function NavListQuery({
  onChange
}: {
  onChange: (next: boolean, pathname: string) => void
}) {
  const showList = useSearchParams().has(NAV_LIST_PARAM)
  const pathname = usePathname()
  useEffect(() => {
    onChange(showList, pathname)
  }, [showList, pathname, onChange])
  return null
}
