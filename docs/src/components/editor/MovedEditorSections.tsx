'use client'

import { useEffect } from 'react'

import { usePathname, useRouter } from 'next/navigation'

import { movedEditorSection } from './movedSections'

// Old links to a section of the Editor page land on the page it moved to.
export function MovedEditorSections() {
  const pathname = usePathname()
  const router = useRouter()
  useEffect(() => {
    if (pathname.replace(/\/$/, '') !== '/components/editor') return
    const moved = movedEditorSection(window.location.hash)
    if (moved) router.replace(moved)
  }, [pathname, router])
  return null
}
