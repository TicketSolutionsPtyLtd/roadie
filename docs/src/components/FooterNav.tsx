'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  title: string
  href?: string
  label?: boolean
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

  const flatNav = items.reduce<(NavItem & { href: string })[]>(
    (acc, section) => {
      return [
        ...acc,
        ...(section.items.filter(
          (item) => !item.label && item.href
        ) as (NavItem & { href: string })[])
      ]
    },
    []
  )

  const currentIndex = flatNav.findIndex((item) => item.href === pathname)

  const prev = currentIndex > 0 ? flatNav[currentIndex - 1] : undefined
  const next =
    currentIndex < flatNav.length - 1 ? flatNav[currentIndex + 1] : undefined

  if (!prev && !next) return null

  return (
    <div className='mt-12 flex w-full flex-row justify-between border-t border-subtle pt-12'>
      {prev && (
        <Link href={prev.href} className='group grid gap-1 no-underline'>
          <span className='text-sm text-subtle'>Previous page</span>
          <span className='group-hover:text-accent-11 text-default intent-accent'>
            &larr; {prev.title}
          </span>
        </Link>
      )}
      {next && (
        <Link
          href={next.href}
          className='group ml-auto grid gap-1 text-right no-underline'
        >
          <span className='text-sm text-subtle'>Next page</span>
          <span className='group-hover:text-accent-11 text-default intent-accent'>
            {next.title} &rarr;
          </span>
        </Link>
      )}
    </div>
  )
}
