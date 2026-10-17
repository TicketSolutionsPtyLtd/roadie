'use client'

import { useRef, useState } from 'react'

import { TrashIcon } from '@phosphor-icons/react'

import {
  type RecordField,
  type RecordFilter,
  recordOperatorLabel
} from '@oztix/roadie-core/records'

import { Button } from '../Button'
import { DatePicker } from '../DatePicker'
import { DateRangePicker } from '../DateRangePicker'
import { Select } from '../Select'
import {
  DATE_OPERATORS,
  type DateDraft,
  type DateOperator,
  dateOperatorOf,
  draftOf,
  filterOf,
  isEmptyDraft,
  withCondition
} from './filterDraft'
import { datePresets, filterKey } from './searchSuggestions'

// Timestamps keep their time; venue and plain dates are whole days.
const granularity = (field: RecordField) =>
  (field.moment ?? 'timestamp') === 'timestamp' ? 'minute' : 'day'

const capitalise = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1)

const operatorLabel = (operator: DateOperator) =>
  capitalise(operator === 'range' ? 'is within' : recordOperatorLabel(operator))

export type RecordsFilterEditorProps = {
  /** A date field. */
  field: RecordField
  /** The filter being edited, or null for a new one. */
  filter: RecordFilter | null
  /** Each complete change, as it is made. */
  onChange: (filter: RecordFilter) => void
  /** Shown for a filter that exists. */
  onRemove?: () => void
  /** Whether the dates have been cleared, so the filter asks for nothing. */
  onEmptyChange?: (empty: boolean) => void
  timeZone: string
  /** Today in `timeZone`, as the records read it. */
  today?: string
}

/** Custom dates: a date filter's condition and dates, written as they change. */
export function RecordsFilterEditor({
  field,
  filter,
  onChange,
  onRemove,
  onEmptyChange,
  timeZone,
  today
}: RecordsFilterEditorProps) {
  const [draft, setDraft] = useState(() => draftOf(filter))
  // The last filter written, which a parent may not have shown yet.
  const sent = useRef(filter)
  const update = (next: DateDraft) => {
    setDraft(next)
    const held = sent.current
    // Emptied only by clearing the dates it holds, not by trying another condition.
    onEmptyChange?.(
      !!held && next.operator === dateOperatorOf(held) && isEmptyDraft(next)
    )
    const made = filterOf(field.key, next)
    if (!made || (held && filterKey(made) === filterKey(held))) return
    sent.current = made
    onChange(made)
  }
  const name = field.label

  return (
    <div data-slot='records-filter-editor' className='grid gap-3'>
      <Select
        value={draft.operator}
        onValueChange={(operator) =>
          update(
            withCondition(draft, operator as DateOperator, { today, timeZone })
          )
        }
      >
        <Select.Trigger
          data-slot='records-filter-operator'
          aria-label={`${name} condition`}
        >
          <Select.Value />
          <Select.Icon />
        </Select.Trigger>
        <Select.Content>
          {DATE_OPERATORS.map((operator) => (
            <Select.Item key={operator} value={operator}>
              {operatorLabel(operator)}
            </Select.Item>
          ))}
        </Select.Content>
      </Select>
      {draft.operator === 'range' ? (
        <DateRangePicker
          data-filter-value=''
          aria-label={name}
          value={draft.range}
          onValueChange={(range) => update({ ...draft, range })}
          presets={datePresets(field)
            .filter((value) => value !== 'upcoming' && value !== 'past')
            .map((value) => ({ value }))}
          timeZone={timeZone}
          today={today}
          granularity={granularity(field)}
        />
      ) : (
        <DatePicker
          granularity={granularity(field)}
          data-filter-value=''
          aria-label={name}
          value={draft.date}
          onValueChange={(date) => update({ ...draft, date })}
          timeZone={timeZone}
          today={today}
        />
      )}
      {onRemove && (
        <Button
          size='sm'
          emphasis='subtler'
          className='justify-self-start'
          onClick={onRemove}
        >
          <TrashIcon weight='bold' className='size-4' aria-hidden />
          Remove filter
        </Button>
      )}
    </div>
  )
}
RecordsFilterEditor.displayName = 'RecordsFilterEditor'
