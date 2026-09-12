import { type ReactNode, useId } from 'react'

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
  /** Primary text; the only required prop. */
  title: ReactNode
  /** Secondary line beneath the title. */
  subtitle?: ReactNode
  /** Leading slot — an `IconTile`, `Image`, or avatar. */
  leading?: ReactNode
  /** Trailing slot — a count, `Badge`, value, or selected check. */
  trailing?: ReactNode
  /** Show the drill-in chevron; defaults to whether `href` is set. */
  chevron?: boolean
  /** Link target, routed like `Card`'s `href`; omit to render a `<button>`. */
  href?: string
  /** Marks the item as current; `true` or a token sets `aria-current`. */
  current?: ListItemCurrent
  className?: string
  onClick?: () => void
}

export type ListItemCurrent = boolean | 'page' | 'step' | 'location'

/** A row in a `List`: a link when `href` is set, otherwise a `<button>`. */
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
  const subtitleId = useId()
  const describedBy = subtitle != null ? subtitleId : undefined

  const content = (
    <>
      {hasLeading ? (
        <span className={listItemLeadingClass}>{leading}</span>
      ) : null}
      <span data-slot='list-item-content' className={listItemContentClass}>
        {subtitle != null ? (
          <span className={listItemBodyClass}>
            <span className={listItemTitleClass}>{title}</span>
            {/* Out of the name; `aria-describedby` still reads a hidden target. */}
            <span
              id={subtitleId}
              aria-hidden='true'
              className={listItemSubtitleClass}
            >
              {subtitle}
            </span>
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
          aria-describedby={describedBy}
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
          aria-describedby={describedBy}
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
