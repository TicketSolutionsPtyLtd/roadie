import { type MouseEvent, type ReactNode, useId } from 'react'

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
  onClick?: (event: MouseEvent<HTMLElement>) => void
}

export type ListItemCurrent = boolean | 'page' | 'step' | 'location'

export type ListItemContentProps = Pick<
  ListItemProps,
  'title' | 'subtitle' | 'leading' | 'trailing'
> & {
  chevron: boolean
  /** Moves the subtitle out of the name, for a row that points `aria-describedby` at this id. */
  subtitleId?: string
}

/** A row's anatomy, for a row whose element `List.Item` can't render, e.g. a menu trigger. */
export function ListItemContent({
  title,
  subtitle,
  leading,
  trailing,
  chevron,
  subtitleId
}: ListItemContentProps) {
  const hasTrailing = trailing != null || chevron
  return (
    <>
      {leading != null ? (
        <span data-slot='list-item-leading' className={listItemLeadingClass}>
          {leading}
        </span>
      ) : null}
      <span data-slot='list-item-content' className={listItemContentClass}>
        {subtitle != null ? (
          <span data-slot='list-item-body' className={listItemBodyClass}>
            <span data-slot='list-item-title' className={listItemTitleClass}>
              {title}
            </span>
            {/* Out of the name; `aria-describedby` still reads a hidden target. */}
            <span
              data-slot='list-item-subtitle'
              id={subtitleId}
              aria-hidden={subtitleId != null ? 'true' : undefined}
              className={listItemSubtitleClass}
            >
              {subtitle}
            </span>
          </span>
        ) : (
          <span data-slot='list-item-title' className={listItemTitleClass}>
            {title}
          </span>
        )}
        {hasTrailing ? (
          <span
            data-slot='list-item-trailing'
            className={listItemTrailingClass}
          >
            {trailing}
            {chevron ? (
              <CaretRightIcon
                weight='bold'
                data-slot='list-item-chevron'
                className={listItemChevronClass}
              />
            ) : null}
          </span>
        ) : null}
      </span>
    </>
  )
}

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
  const subtitleId = useId()
  const describedBy = subtitle != null ? subtitleId : undefined

  const content = (
    <ListItemContent
      title={title}
      subtitle={subtitle}
      subtitleId={subtitleId}
      leading={leading}
      trailing={trailing}
      chevron={chevron ?? href !== undefined}
    />
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
