import { type MouseEvent, type ReactNode, useId } from 'react'

import { CaretRightIcon } from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

import { RoadieRoutedLink } from '../Link/RoadieRoutedLink'
import {
  listItemBodyClass,
  listItemChevronClass,
  listItemContentClass,
  listItemDescriptionClass,
  listItemLeadingClass,
  listItemTitleClass,
  listItemTrailingClass,
  listItemVariants
} from './variants'

export type ListItemProps = {
  /** Primary text; the only required prop. */
  title: ReactNode
  /** Secondary line beneath the title. */
  description?: ReactNode
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
  'title' | 'description' | 'leading' | 'trailing'
> & {
  chevron: boolean
  /** Moves the description out of the name, for a row that points `aria-describedby` at this id. */
  descriptionId?: string
}

/** A row's anatomy, for a row whose element `List.Item` can't render, e.g. a menu trigger. */
export function ListItemContent({
  title,
  description,
  leading,
  trailing,
  chevron,
  descriptionId
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
        {description != null ? (
          <span data-slot='list-item-body' className={listItemBodyClass}>
            <span data-slot='list-item-title' className={listItemTitleClass}>
              {title}
            </span>
            {/* Out of the name; `aria-describedby` still reads a hidden target. */}
            <span
              data-slot='list-item-description'
              id={descriptionId}
              aria-hidden={descriptionId != null ? 'true' : undefined}
              className={listItemDescriptionClass}
            >
              {description}
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
  description,
  leading,
  trailing,
  chevron,
  href,
  current = false,
  className,
  onClick
}: ListItemProps) {
  const descriptionId = useId()
  const describedBy = description != null ? descriptionId : undefined

  const content = (
    <ListItemContent
      title={title}
      description={description}
      descriptionId={descriptionId}
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
