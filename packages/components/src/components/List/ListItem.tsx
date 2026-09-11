import type { ReactNode } from 'react'

import { CaretRightIcon } from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

import { RoadieRoutedLink } from '../Link/RoadieRoutedLink'
import {
  listItemBodyClass,
  listItemChevronClass,
  listItemContentClass,
  listItemLeadingClass,
  listItemSubtitleClass,
  listItemTitleClass,
  listItemTrailingClass,
  listItemVariants
} from './variants'

export type ListItemProps = {
  /** The only required prop. An item with nothing else renders correctly. */
  title: ReactNode
  /** Secondary line beneath the title. */
  subtitle?: ReactNode
  /** Leading slot — an `IconTile`, `Image`, or avatar. */
  leading?: ReactNode
  /** Trailing slot — a count, `Badge`, value, or selected check. Sits to the
   * left of the chevron when both are shown. */
  trailing?: ReactNode
  /**
   * Show the trailing drill-in chevron. Defaults to `true` when `href` is set
   * and `false` otherwise — force it on an `onClick`-only row with `chevron`,
   * or suppress it on a link with `chevron={false}`.
   */
  chevron?: boolean
  /**
   * Routes through `RoadieLinkProvider` — same smart-href contract as
   * `Card`: internal hrefs route through the provider, `http(s)://` /
   * `//` render `<a target='_blank' rel='noopener noreferrer'>`,
   * `mailto:` / `tel:` / `sms:` render plain anchors. Omit to render a
   * `<button>`.
   */
  href?: string
  /**
   * Marks the item as current. `true` emits `aria-current="true"` — the right
   * choice for a selection such as an org picker. A token emits itself:
   * `current='page'` for a navigation row pointing at the current page.
   */
  current?: ListItemCurrent
  className?: string
  onClick?: () => void
}

export type ListItemCurrent = boolean | 'page' | 'step' | 'location'

/**
 * List item.
 *
 * `href` set → delegates to `RoadieRoutedLink`, the same primitive `Card`
 * uses for smart-href routing. No `href` → plain `<button>`.
 *
 * Stays server-safe like `CardRoot` — `RoadieRoutedLink` is the
 * `'use client'` boundary and only loads when `href` is actually set.
 */
export function ListItem({
  title,
  subtitle,
  leading,
  trailing,
  chevron,
  href,
  current = false,
  className,
  onClick
}: ListItemProps) {
  const showChevron = chevron ?? href !== undefined
  const hasTrailing = trailing != null || showChevron
  const hasLeading = leading != null

  const content = (
    <>
      {hasLeading ? (
        <span className={listItemLeadingClass}>{leading}</span>
      ) : null}
      <span data-slot='list-item-content' className={listItemContentClass}>
        {subtitle != null ? (
          <span className={listItemBodyClass}>
            <span className={listItemTitleClass}>{title}</span>
            <span className={listItemSubtitleClass}>{subtitle}</span>
          </span>
        ) : (
          <span className={listItemTitleClass}>{title}</span>
        )}
        {hasTrailing ? (
          <span className={listItemTrailingClass}>
            {trailing}
            {showChevron ? (
              <CaretRightIcon weight='bold' className={listItemChevronClass} />
            ) : null}
          </span>
        ) : null}
      </span>
    </>
  )

  const finalClassName = cn(
    listItemVariants({ selected: current !== false }),
    className
  )
  const ariaCurrent = current === false ? undefined : current

  return (
    <li>
      {href !== undefined ? (
        <RoadieRoutedLink
          data-slot='list-item'
          aria-current={ariaCurrent}
          className={finalClassName}
          href={href}
          onClick={onClick}
        >
          {content}
        </RoadieRoutedLink>
      ) : (
        <button
          type='button'
          data-slot='list-item'
          aria-current={ariaCurrent}
          className={finalClassName}
          onClick={onClick}
        >
          {content}
        </button>
      )}
    </li>
  )
}

ListItem.displayName = 'List.Item'
