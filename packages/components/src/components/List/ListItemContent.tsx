import type { ReactNode } from 'react'

import { CaretRightIcon } from '@phosphor-icons/react/ssr'

import {
  listItemBodyClass,
  listItemChevronClass,
  listItemContentClass,
  listItemDescriptionClass,
  listItemLeadingClass,
  listItemTitleClass,
  listItemTrailingClass
} from './variants'

export type ListItemContentProps = {
  title: ReactNode
  description?: ReactNode
  leading?: ReactNode
  trailing?: ReactNode
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
