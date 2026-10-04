import { Fragment, type ReactNode, memo } from 'react'

import { formatRecordValue } from '@oztix/roadie-core/records'
import { cn } from '@oztix/roadie-core/utils'

import { CardContent } from '../Card/CardContent'
import { CardDescription } from '../Card/CardDescription'
import { CardHeader } from '../Card/CardHeader'
import { CardLink } from '../Card/CardLink'
import { CardRoot } from '../Card/CardRoot'
import { RecordImage } from './RecordImage'
import { RecordPartValue } from './RecordPartValue'
import { RecordsRowActions } from './RecordsRowActions'
import { RecordsRowCheckbox } from './RecordsRowCheckbox'
import type { RecordCardParts, RecordPart } from './types'

/** The text that names a record, from its title part, else its id. */
export function recordTitle(row: object, id: string, title?: RecordPart) {
  // A title is text, which reads the same in any zone.
  const text = title
    ? formatRecordValue(row, title.field, { timeZone: 'UTC' })
    : null
  return text?.trim() ? text : id
}

const isFigure = (part: RecordPart) =>
  part.field.type === 'number' || part.field.type === 'money'

export type RecordCardProps = {
  id: string
  row: object
  parts: RecordCardParts
  /** The viewer's zone, for dates. */
  timeZone?: string
  /** Links the card by its title. Left out in Select mode, where the checkbox takes the tap. */
  href?: string
  /** Undefined when the records can't be selected. */
  selected?: boolean
  /** Select mode: a checkbox leads and covers the card. */
  selecting?: boolean
  onToggle?: (id: string, range: boolean) => void
  rowActions?: (row: object) => ReactNode
  /** The banner image's `sizes`, for a card narrower than the screen, such as in a grid. */
  imageSizes?: string
  className?: string
}

/**
 * A record as a card: an image banner, the title with its description,
 * leading and trailing values, and details as label and value pairs.
 * Shared by the table's narrow cards and the grid.
 */
export const RecordCard = memo(function RecordCard({
  id,
  row,
  parts,
  timeZone,
  href: linkHref,
  selected,
  selecting = false,
  onToggle,
  rowActions,
  imageSizes,
  className
}: RecordCardProps) {
  const href = selecting ? undefined : linkHref
  const name = recordTitle(row, id, parts.title)
  const value = (part: RecordPart | undefined) =>
    part && <RecordPartValue part={part} row={row} timeZone={timeZone} />
  const banner = parts.image
  const leading = value(parts.leading)
  const trailing = value(parts.trailing)
  const hasDetails = parts.details.length > 0
  const title = parts.title ? value(parts.title) : id
  return (
    <CardRoot
      data-slot='record-card'
      intent={selected ? 'accent' : undefined}
      emphasis={selected ? 'subtle' : 'normal'}
      className={cn(
        'grid-cols-1 tabular-nums',
        banner && 'overflow-hidden',
        className
      )}
    >
      {banner && (
        <div data-slot='record-card-media' className='relative'>
          {banner.cell ? (
            value(banner)
          ) : (
            <RecordImage part={banner} row={row} banner sizes={imageSizes} />
          )}
          {trailing && (
            <div
              data-slot='record-card-trailing'
              className='absolute end-3 top-3 text-sm text-strong'
            >
              {trailing}
            </div>
          )}
        </div>
      )}
      <CardHeader
        className={cn(
          'flex items-start gap-3 px-4 pt-4',
          !hasDetails && 'pb-4'
        )}
      >
        {selecting ? (
          // Takes the leading slot's place, at its size, so titles don't shift.
          <div
            className={cn(
              'grid shrink-0 place-items-center',
              parts.leading?.kind === 'image' && 'size-10'
            )}
          >
            <RecordsRowCheckbox
              id={id}
              title={name}
              selected={selected ?? false}
              onToggle={(toggled, range) => onToggle?.(toggled, range)}
              rowTarget
            />
          </div>
        ) : (
          leading && <div className='shrink-0'>{leading}</div>
        )}
        <div className='grid min-w-0 flex-1 grid-cols-1 gap-0.5'>
          {/* A p, not CardTitle's h3: a layout can't know the page's outline. */}
          <p data-slot='card-title' className='text-display-ui-6 text-strong'>
            {href === undefined ? (
              title
            ) : (
              <CardLink href={href} data-row-link=''>
                {title}
              </CardLink>
            )}
          </p>
          {parts.description && (
            <CardDescription className='truncate'>
              {value(parts.description)}
            </CardDescription>
          )}
        </div>
        {!banner && trailing && (
          <div className='shrink-0 text-sm text-strong'>{trailing}</div>
        )}
        {rowActions && (
          <div
            data-row-control
            className='relative z-docked -me-1 -mt-0.5 shrink-0'
          >
            <RecordsRowActions title={name} row={row} rowActions={rowActions} />
          </div>
        )}
      </CardHeader>
      {hasDetails && (
        <CardContent className='px-4 pt-3 pb-4'>
          <dl className='grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm'>
            {parts.details.map((part) => (
              <Fragment key={part.key}>
                <dt className='text-subtle'>{part.field.label}</dt>
                <dd className={cn('min-w-0', isFigure(part) && 'text-end')}>
                  {value(part)}
                </dd>
              </Fragment>
            ))}
          </dl>
        </CardContent>
      )}
    </CardRoot>
  )
})
RecordCard.displayName = 'RecordCard'
