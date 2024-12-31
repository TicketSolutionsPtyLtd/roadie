'use client'

import { usePathname } from 'next/navigation'

import { Footer } from './Footer'

interface NavItem {
  title: string
  href: string
}

interface NavSection {
  title: string
  href: string
  items: NavItem[]
}

interface FooterNavProps {
  items: NavSection[]
}

export function FooterNav({ items }: FooterNavProps) {
  const pathname = usePathname()

  // Flatten the navigation structure
  const flatNav = items.reduce<NavItem[]>((acc, section) => {
    return [...acc, ...section.items]
  }, [])

  // Find the current page index
  const currentIndex = flatNav.findIndex((item) => item.href === pathname)

  const prev = currentIndex > 0 ? flatNav[currentIndex - 1] : undefined
  const next = currentIndex < flatNav.length - 1 ? flatNav[currentIndex + 1] : undefined

  return <Footer prev={prev} next={next} />
}
