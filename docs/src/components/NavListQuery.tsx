'use client'

import { useEffect } from 'react'

import { useSearchParams } from 'next/navigation'

export const NAV_LIST_PARAM = 'nav'

export function NavListQuery({
  onChange
}: {
  onChange: (next: boolean) => void
}) {
  const showList = useSearchParams().has(NAV_LIST_PARAM)
  useEffect(() => {
    onChange(showList)
  }, [showList, onChange])
  return null
}
