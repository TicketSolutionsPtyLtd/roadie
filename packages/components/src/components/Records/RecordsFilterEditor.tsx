'use client'

import { useMemo, useRef, useState } from 'react'

import { MagnifyingGlassIcon, TrashIcon } from '@phosphor-icons/react'

import {
  type RecordField,
  type RecordFilter,
  recordFieldOptions,
  recordOperatorLabel,
  recordOptionPaths
} from '@oztix/roadie-core/records'

import { Button } from '../Button'
import { CheckboxGroup } from '../CheckboxGroup'
import { DatePicker } from '../DatePicker'
import { DateRangePicker } from '../DateRangePicker'
import { EmptyState } from '../EmptyState'
import { Input } from '../Input'
import { NumberField } from '../NumberField'
import { RadioGroup } from '../RadioGroup'
import { Select } from '../Select'
import {
  type EditorOperator,
  type FilterDraft,
  draftOf,
  editorOperatorOf,
  editorOperators,
  filterOf,
  isEmptyDraft
} from './filterDraft'
import { datePresets, filterKey } from './searchSuggestions'

const SEARCHABLE_OPTIONS = 8

// Timestamps keep their time; venue and plain dates are whole days.
const granularity = (field: RecordField) =>
  (field.moment ?? 'timestamp') === 'timestamp' ? 'minute' : 'day'

const capitalise = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1)

const operatorLabel = (operator: EditorOperator) =>
  capitalise(operator === 'range' ? 'is within' : recordOperatorLabel(operator))

const BOOLEAN_LABELS: Partial<Record<EditorOperator, string>> = {
  'is-true': 'Yes',
  'is-false': 'No',
  'is-set': 'Not empty',
  'is-not-set': 'Empty'
}

const NO_VALUE = new Set<EditorOperator>([
  'is-true',
  'is-false',
  'is-set',
  'is-not-set'
])

export type RecordsFilterEditorProps = {
  field: RecordField
  /** The filter being edited, or null for a new one. */
  filter: RecordFilter | null
  /** Each complete change, as it is made. */
  onChange: (filter: RecordFilter) => void
  /** Shown for a filter that exists. */
  onRemove?: () => void
  /** Whether the value has been cleared, so the filter asks for nothing. */
  onEmptyChange?: (empty: boolean) => void
  timeZone: string
}

/** One filter's operator and value, written as they change. */
export function RecordsFilterEditor({
  field,
  filter,
  onChange,
  onRemove,
  onEmptyChange,
  timeZone
}: RecordsFilterEditorProps) {
  const [draft, setDraft] = useState(() => draftOf(field, filter))
  // The last filter written, which a parent may not have shown yet.
  const sent = useRef(filter)
  const update = (patch: Partial<FilterDraft>) => {
    const next = { ...draft, ...patch }
    setDraft(next)
    const held = sent.current
    // Emptied only by clearing the value it holds, not by trying another condition.
    onEmptyChange?.(
      !!held &&
        next.operator === editorOperatorOf(held, field) &&
        isEmptyDraft(field, next)
    )
    const made = filterOf(field, next)
    if (!made || (held && filterKey(made) === filterKey(held))) return
    sent.current = made
    onChange(made)
  }
  const name = field.label

  return (
    <div data-slot='records-filter-editor' className='grid gap-3'>
      {field.type === 'boolean' ? (
        <RadioGroup
          aria-label={name}
          value={draft.operator}
          onValueChange={(operator) =>
            update({ operator: operator as EditorOperator })
          }
        >
          {editorOperators(field).map((operator) => (
            <RadioGroup.Item
              key={operator}
              value={operator}
              label={BOOLEAN_LABELS[operator] ?? operatorLabel(operator)}
            />
          ))}
        </RadioGroup>
      ) : (
        <Select
          value={draft.operator}
          onValueChange={(operator) =>
            update({ operator: operator as EditorOperator })
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
            {editorOperators(field).map((operator) => (
              <Select.Item key={operator} value={operator}>
                {operatorLabel(operator)}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
      )}
      {!NO_VALUE.has(draft.operator) && (
        <ValueEditor
          field={field}
          draft={draft}
          update={update}
          timeZone={timeZone}
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

type ValueEditorProps = {
  field: RecordField
  draft: FilterDraft
  update: (patch: Partial<FilterDraft>) => void
  timeZone: string
}

function ValueEditor({ field, draft, update, timeZone }: ValueEditorProps) {
  const name = field.label
  switch (field.type) {
    case 'option':
      return <OptionValues field={field} draft={draft} update={update} />
    case 'text':
      return (
        <Input
          data-filter-value=''
          aria-label={`${name} text`}
          value={draft.text}
          onChange={(event) => update({ text: event.target.value })}
        />
      )
    case 'number':
    case 'money':
      return draft.operator === 'between' ? (
        <div className='grid grid-cols-2 gap-2'>
          <NumberField
            data-filter-value=''
            aria-label={`${name} from`}
            value={draft.low}
            onValueChange={(low) => update({ low })}
          />
          <NumberField
            aria-label={`${name} to`}
            value={draft.high}
            onValueChange={(high) => update({ high })}
          />
        </div>
      ) : (
        <NumberField
          data-filter-value=''
          aria-label={`${name} value`}
          value={draft.low}
          onValueChange={(low) => update({ low })}
        />
      )
    case 'date':
      return draft.operator === 'range' ? (
        <DateRangePicker
          data-filter-value=''
          aria-label={`${name} dates`}
          value={draft.range}
          onValueChange={(range) => update({ range })}
          presets={datePresets(field)
            .filter((value) => value !== 'upcoming' && value !== 'past')
            .map((value) => ({ value }))}
          timeZone={timeZone}
          granularity={granularity(field)}
        />
      ) : (
        <DatePicker
          granularity={granularity(field)}
          data-filter-value=''
          aria-label={`${name} date`}
          value={draft.date}
          onValueChange={(date) => update({ date })}
          timeZone={timeZone}
        />
      )
    default:
      return null
  }
}

function OptionValues({
  field,
  draft,
  update
}: Omit<ValueEditorProps, 'timeZone'>) {
  const [query, setQuery] = useState('')
  const options = useMemo(() => {
    const paths = recordOptionPaths(field)
    return recordFieldOptions(field).map((option) => ({
      value: option.value,
      label: paths.get(option.value) ?? option.label
    }))
  }, [field])
  // A chosen value the list lacks, such as one from a link, can still be unticked.
  const [held] = useState(() =>
    draft.values
      .filter((value) => !options.some((option) => option.value === value))
      .map((value) => ({ value, label: value }))
  )
  const listed = [...options, ...held]
  if (options.length === 0)
    return (
      <Input
        data-filter-value=''
        aria-label={`${field.label} value`}
        value={draft.text}
        onChange={(event) =>
          update({
            text: event.target.value,
            values: [event.target.value.trim()].filter(Boolean)
          })
        }
      />
    )
  const text = query.trim().toLowerCase()
  const shown = text
    ? listed.filter(
        (option) =>
          option.label.toLowerCase().includes(text) ||
          draft.values.includes(option.value)
      )
    : listed
  return (
    <div className='grid gap-2'>
      {listed.length > SEARCHABLE_OPTIONS && (
        <div className='relative grid'>
          <Input
            size='sm'
            aria-label={`Find a ${field.label.toLowerCase()}`}
            placeholder='Find'
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className='ps-7'
          />
          <MagnifyingGlassIcon
            aria-hidden
            weight='bold'
            className='pointer-events-none absolute start-2 top-1/2 size-4 -translate-y-1/2 text-subtle'
          />
        </div>
      )}
      <CheckboxGroup
        aria-label={field.label}
        value={draft.values}
        onValueChange={(values) => update({ values })}
        className='max-h-64 overflow-y-auto'
      >
        {shown.map((option) => (
          <CheckboxGroup.Item
            key={option.value}
            value={option.value}
            label={option.label}
          />
        ))}
      </CheckboxGroup>
      {shown.length === 0 && text && (
        <EmptyState size='sm'>
          <EmptyState.Title render={<p />}>
            No {field.label.toLowerCase()} matches “{query.trim()}”
          </EmptyState.Title>
        </EmptyState>
      )}
    </div>
  )
}
