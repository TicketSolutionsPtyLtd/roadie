'use client'

import { useRef, useState } from 'react'

import { CaretLeftIcon, TrashIcon } from '@phosphor-icons/react'

import { isAbsoluteRange } from '@oztix/roadie-core/datetime'
import {
  type RecordField,
  type RecordFilter,
  recordOperatorLabel
} from '@oztix/roadie-core/records'

import { Button } from '../Button'
import { Calendar } from '../Calendar'
import { DatePicker } from '../DatePicker'
import { DateRangePicker } from '../DateRangePicker'
import { Select } from '../Select'
import { ToggleGroup } from '../ToggleGroup'
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

const SHORT_LABELS: Record<DateOperator, string> = {
  range: 'Within',
  on: 'On',
  before: 'Before',
  after: 'After'
}

export type RecordsDatesPanelProps = Pick<
  RecordsFilterEditorProps,
  'field' | 'filter' | 'timeZone' | 'today'
> & {
  /** The filter, once its dates are picked. */
  onChange: (filter: RecordFilter) => void
  /** Returns to the list. */
  onBack: () => void
}

/**
 * Prototype (INNO-1278): Custom dates as a calendar in the dropdown, for
 * phones. Days only, so a timestamp field's times wait for the editor.
 */
export function RecordsDatesPanel({
  field,
  filter,
  timeZone,
  today,
  onChange,
  onBack
}: RecordsDatesPanelProps) {
  const [draft, setDraft] = useState(() => draftOf(filter))
  const take = (next: DateDraft) => {
    const made = filterOf(field.key, next)
    if (made) onChange(made)
  }
  const range =
    draft.range && isAbsoluteRange(draft.range) ? draft.range : undefined
  const calendar = { autoFocus: true, timeZone, today }

  return (
    <div data-slot='records-dates-panel' className='grid gap-2'>
      <Button
        size='sm'
        emphasis='subtler'
        className='justify-self-start'
        onClick={onBack}
      >
        <CaretLeftIcon weight='bold' className='size-4' aria-hidden />
        Back
      </Button>
      <ToggleGroup
        aria-label={`${field.label} condition`}
        size='md'
        emphasis='subtler'
        value={[draft.operator]}
        onValueChange={([operator]) => {
          if (operator)
            setDraft({ ...draft, operator: operator as DateOperator })
        }}
        className='auto-cols-max justify-self-start'
      >
        {DATE_OPERATORS.map((operator) => (
          <ToggleGroup.Item key={operator} value={operator} className='min-w-8'>
            {SHORT_LABELS[operator]}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup>
      {draft.operator === 'range' ? (
        <Calendar
          key='range'
          mode='range'
          aria-label={`${field.label} dates`}
          defaultSelected={range}
          onSelect={({ start, end }) => {
            if (start && end) take({ ...draft, range: { start, end } })
          }}
          {...calendar}
        />
      ) : (
        <Calendar
          key='date'
          mode='single'
          aria-label={`${field.label} date`}
          defaultSelected={draft.date}
          onSelect={(date) => {
            if (date) take({ ...draft, date })
          }}
          {...calendar}
        />
      )}
    </div>
  )
}
RecordsDatesPanel.displayName = 'RecordsDatesPanel'
