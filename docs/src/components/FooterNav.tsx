'use client'

import Link from 'next/link'

import { useRoute } from '@/lib/route'

import { DateTime } from '@oztix/roadie-components/date-time'

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
  /** `YYYY-MM-DD`, in UTC, when the page last changed. */
  updated?: string
}

export function FooterNav({ items, updated }: FooterNavProps) {
  const route = useRoute()

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

  const currentIndex = flatNav.findIndex((item) => item.href === route)
  const prev = currentIndex > 0 ? flatNav[currentIndex - 1] : undefined
  const next =
    currentIndex >= 0 && currentIndex < flatNav.length - 1
      ? flatNav[currentIndex + 1]
      : undefined

  if (!prev && !next && !updated) return null

  return (
    <footer className='mt-12 grid gap-8 border-t border-subtle pt-12'>
      {prev || next ? (
        <div className='flex w-full flex-row justify-between'>
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
      ) : null}
      {updated ? (
        <p className='text-sm text-subtle'>
          Last updated{' '}
          <DateTime
            at={new Date(`${updated}T00:00:00Z`)}
            timeZone='UTC'
            dateStyle='medium'
          />
        </p>
      ) : null}
    </footer>
  )
}
