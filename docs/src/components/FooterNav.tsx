'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

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

  if (pathname === '/') return null

  const flatNav = items.reduce<NavItem[]>((acc, section) => {
    return [...acc, ...section.items]
  }, [])

  const currentIndex = flatNav.findIndex((item) => item.href === pathname)

  const prev = currentIndex > 0 ? flatNav[currentIndex - 1] : undefined
  const next =
    currentIndex < flatNav.length - 1 ? flatNav[currentIndex + 1] : undefined

  if (!prev && !next) return null

  return (
    <div className="pt-12 border-t border-neutral-7 flex justify-between flex-row w-full">
      {prev && (
        <Link href={prev.href} className="flex flex-col gap-1 group no-underline">
          <span className="text-sm emphasis-subtle-fg">Previous page</span>
          <span className="intent-accent emphasis-default-fg group-hover:text-accent-11">
            &larr; {prev.title}
          </span>
        </Link>
      )}
      {next && (
        <Link href={next.href} className="flex flex-col gap-1 ml-auto text-right group no-underline">
          <span className="text-sm emphasis-subtle-fg">Next page</span>
          <span className="intent-accent emphasis-default-fg group-hover:text-accent-11">
            {next.title} &rarr;
          </span>
        </Link>
      )}
    </div>
  )
}
