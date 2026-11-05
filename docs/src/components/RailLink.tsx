import type { MouseEvent, ReactNode } from 'react'

import { cn } from '@oztix/roadie-core/utils'

/** A row in a page rail, such as On this page or the changelog's months. */
export function RailLink({
  href,
  active,
  indent,
  onSelect,
  children
}: {
  href: string
  active: boolean
  indent?: boolean
  onSelect: (event: MouseEvent<HTMLAnchorElement>) => void
  children: ReactNode
}) {
  return (
    <li
      className={cn('-ml-px border-l border-transparent pl-3', {
        'pl-6': indent,
        'border-accent-9': active
      })}
    >
      <a
        href={href}
        aria-current={active ? 'location' : undefined}
        onClick={onSelect}
        className={cn(
          'block rounded-sm text-sm is-focusable',
          active ? 'font-semibold is-selected-label' : 'is-unselected'
        )}
      >
        {children}
      </a>
    </li>
  )
}
