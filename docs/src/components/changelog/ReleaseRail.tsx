'use client'

import { type MouseEvent, useSyncExternalStore } from 'react'

import { RailLink } from '../RailLink'

export type RailMonth = {
  key: string
  year: string
  month: string
  slug: string
}

// Outside React state, so scrolling re-renders only the rail.
let activeMonth: string | null = null
const listeners = new Set<() => void>()

export function setActiveMonth(key: string | null) {
  if (activeMonth === key) return
  activeMonth = key
  listeners.forEach((listener) => listener())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const UNRELEASED = 'unreleased'

/** The changelog's months, by year, each jumping to its newest release whether or not it's rendered yet. */
export function ReleaseRail({
  months,
  pending,
  onSelect
}: {
  months: RailMonth[]
  pending: boolean
  onSelect: (slug: string) => void
}) {
  const active = useSyncExternalStore(
    subscribe,
    () => activeMonth,
    () => null
  )
  const years = [...new Set(months.map((month) => month.year))]
  const select = (slug: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    onSelect(slug)
  }
  return (
    <nav aria-label='Releases by month' className='grid gap-4'>
      <p className='text-sm font-semibold text-strong'>Releases</p>
      {pending ? (
        <ul className='grid gap-2 border-l border-subtler'>
          <RailLink
            href={`#${UNRELEASED}`}
            active={active === UNRELEASED}
            onSelect={select(UNRELEASED)}
          >
            Unreleased
          </RailLink>
        </ul>
      ) : null}
      {years.map((year) => (
        <div key={year} className='grid gap-2'>
          <p className='text-xs font-semibold text-subtle'>{year}</p>
          <ul className='grid gap-2 border-l border-subtler'>
            {months
              .filter((month) => month.year === year)
              .map((month) => (
                <RailLink
                  key={month.key}
                  href={`#${month.slug}`}
                  active={active === month.key}
                  onSelect={select(month.slug)}
                >
                  {month.month}
                </RailLink>
              ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}
