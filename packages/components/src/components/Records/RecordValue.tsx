'use client'

import { useSyncExternalStore } from 'react'

import { viewerTimeZone } from '@oztix/roadie-core/datetime'
import { type RecordField, formatRecordValue } from '@oztix/roadie-core/records'
import { cn } from '@oztix/roadie-core/utils'

import { Badge } from '../Badge'

export const NOT_AVAILABLE = 'Not available'
const noSubscription = () => () => {}
const serverZone = () => 'UTC'

export type RecordValueProps = {
  field: RecordField
  row: object
  /** The viewer's zone. Defaults to the browser's. */
  timeZone?: string
  className?: string
}

/**
 * A record's value as its field shows it: a status as a Badge, money and
 * numbers in their format, dates in the house formats, and "Not available"
 * when the record holds nothing.
 */
export function RecordValue({
  field,
  row,
  timeZone,
  className
}: RecordValueProps) {
  const viewerZone = useSyncExternalStore(
    noSubscription,
    viewerTimeZone,
    serverZone
  )
  const zone = timeZone ?? viewerZone
  const raw = (row as Record<string, unknown>)[field.key]
  const text = formatRecordValue(row, field, { timeZone: zone })
  if (text === null)
    return <span className={cn('text-subtle', className)}>{NOT_AVAILABLE}</span>
  if (field.status && (typeof raw === 'string' || typeof raw === 'number')) {
    const key = String(raw)
    const status = Object.hasOwn(field.status, key)
      ? field.status[key]
      : undefined
    // Normal, not subtle: its opaque fill reads on a row's hover tint and on a card's image banner alike.
    return (
      <Badge
        size='sm'
        intent={status?.intent ?? 'neutral'}
        className={cn('max-w-full min-w-0', className)}
      >
        <span className='min-w-0 truncate'>{text}</span>
      </Badge>
    )
  }
  const unread =
    (field.type === 'number' || field.type === 'money') &&
    typeof raw !== 'number'
  return <span className={cn(unread && 'text-subtle', className)}>{text}</span>
}
RecordValue.displayName = 'RecordValue'
