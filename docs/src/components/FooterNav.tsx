'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  title: string
  href?: string
}

interface NavSection {
  title: string
  href?: string
  items: NavItem[]
}

interface FooterNavProps {
  items: NavSection[]
}

export function FooterNav({ items }: FooterNavProps) {
  const pathname = usePathname()

  const flatNav = items.reduce<(NavItem & { href: string })[]>(
    (acc, section) => {
      return [
        ...acc,
        ...(section.items.filter(
          (item) => item.href && !/^(https?:)?\/\//.test(item.href)
        ) as (NavItem & { href: string })[])
      ]
    },
    []
  )

  const currentIndex = flatNav.findIndex((item) => item.href === pathname)
  if (currentIndex === -1) return null

  const prev = currentIndex > 0 ? flatNav[currentIndex - 1] : undefined
  const next =
    currentIndex < flatNav.length - 1 ? flatNav[currentIndex + 1] : undefined

  if (!prev && !next) return null

  return (
    <div className='mt-12 flex w-full flex-row justify-between border-t border-subtle pt-12'>
      {prev && (
        <Link href={prev.href} className='group grid gap-1 no-underline'>
          <span className='text-sm text-subtle'>Previous page</span>
          <span className='text-normal intent-accent group-hover:text-accent-11'>
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
          <span className='text-normal intent-accent group-hover:text-accent-11'>
            {next.title} &rarr;
          </span>
        </Link>
      )}
    </div>
  )
}
