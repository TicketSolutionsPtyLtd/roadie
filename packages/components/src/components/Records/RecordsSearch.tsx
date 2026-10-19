'use client'

import { use, useEffect, useMemo, useState } from 'react'

import { flushSync } from 'react-dom'

import { plainDateOf } from '@oztix/roadie-core/datetime'
import {
  type RecordFilter,
  isRecordOptionField
} from '@oztix/roadie-core/records'
import { cn } from '@oztix/roadie-core/utils'

import { QueryField, type QueryFieldAccepted } from '../QueryField'
import { RecordsDateCalendarLazy } from './RecordsDateCalendarLazy'
import { useRecordsContext } from './context'
import { fieldIcon } from './fieldIcon'
import { whenIdle } from './idle'
import { applyQuery } from './query'
import { SearchFocusContext } from './searchFocus'
import {
  type SearchContext,
  type SearchGroup,
  type SearchValue,
  type ValueOperator,
  calendarOperator,
  filterChipIds,
  heldHint,
  isApplied,
  isEmptiness,
  mergeFilter,
  optionOperator,
  pendingLabel,
  rulesOut,
  sameFilter,
  searchChips,
  stepOperator,
  toggleValue,
  topSuggestions,
  valueHint,
  valueOperators,
  valueSuggestions,
  valueText,
  withAnd
} from './searchSuggestions'
import type { RecordsField } from './types'
import type { RecordsState } from './useRecords'

export type RecordsSearchProps = {
  /** @default 'Search and filter' */
  placeholder?: string
  /** Names the field. Defaults to the placeholder. */
  'aria-label'?: string
  /** A key that focuses the search from anywhere on the page, as `QueryField`'s `focusShortcut` takes it, or `false` for none. @default '/' */
  focusShortcut?: string | false
  className?: string
}

/** A chip whose values the value step edits in the list. */
type Selected = {
  index: number
  /**
   * The filter as selected and each version written since, to find it again
   * if the list moves under it or a parent shows a write late.
   */
  written: RecordFilter[]
}

/** The days the first typed suggestion names: one day, or a range. */
function suggestedDays(
  groups: readonly SearchGroup[]
): { start: string; end: string } | undefined {
  for (const { value } of groups.flatMap((group) => group.items)) {
    if (value.type !== 'filter') continue
    const { filter } = value
    if (filter.operator === 'between') {
      const [start, end] = filter.value
      if (typeof start === 'string' && typeof end === 'string')
        return { start, end }
    }
    if (
      filter.operator === 'on' ||
      filter.operator === 'before' ||
      filter.operator === 'after'
    )
      return { start: filter.value, end: filter.value }
  }
  return undefined
}

/** Where a filter, as written, sits now: at its index, or moved. */
function locate(
  filters: readonly RecordFilter[],
  index: number,
  written: readonly RecordFilter[]
): number | null {
  const ours = (filter: RecordFilter) =>
    written.some((version) => sameFilter(filter, version))
  const held = filters[index]
  if (held && ours(held)) return index
  const found = filters.findIndex(ours)
  return found >= 0 ? found : null
}

const MAX_LISTED_VALUES = 1000

const optionText = (item: unknown) =>
  typeof item === 'number' || typeof item === 'boolean' ? String(item) : item

/** The distinct values rows hold for a key, or null past the listing limit. */
function heldValues(data: readonly object[], key: string): string[] | null {
  const values = new Set<string>()
  for (const row of data) {
    const value = (row as Record<string, unknown>)[key]
    const items = (Array.isArray(value) ? value : [value]).map(optionText)
    for (const text of items)
      if (typeof text === 'string' && text.trim()) values.add(text)
    if (values.size > MAX_LISTED_VALUES) return null
  }
  return [...values].sort((a, b) => a.localeCompare(b, 'en-AU'))
}

// An option field with no `options` lists the values the records hold.
function useListedFields(records: RecordsState): readonly RecordsField[] {
  const { data, fields, mode } = records
  return useMemo(() => {
    if (mode !== 'browser') return fields
    return fields.map((field) => {
      if (!isRecordOptionField(field) || field.options || field.status)
        return field
      const values = heldValues(data, field.key)
      if (!values) return field
      const options = values.map((value) => ({ value, label: value }))
      return { ...field, options }
    })
  }, [data, fields, mode])
}

function withFieldIcons(
  groups: readonly SearchGroup[],
  byKey: ReadonlyMap<string, RecordsField>
): SearchGroup[] {
  return groups.map((group) => ({
    ...group,
    items: group.items.map((item) => {
      const key =
        item.value.type === 'filter'
          ? item.value.filter.field
          : item.value.field
      const field = byKey.get(key)
      return field ? { ...item, icon: fieldIcon(field) } : item
    })
  }))
}

/**
 * Search and filter in one field. Typing searches the records' searchable
 * fields and suggests filters, such as a city or "this weekend", that become
 * chips. Selecting a chip edits its values in the list, and a date picked
 * under is, is before, is after, or is between comes from a calendar there.
 * The page's `scope` shows first, as locked chips.
 */
export function RecordsSearch({
  placeholder = 'Search and filter',
  'aria-label': label,
  focusShortcut = '/',
  className
}: RecordsSearchProps) {
  const { records } = useRecordsContext()
  const fields = useListedFields(records)
  const filters = records.view.query.filters
  const [pending, setPending] = useState<string | null>(null)
  const [pendingOperator, setPendingOperator] = useState<ValueOperator>('is')
  const [stepText, setStepText] = useState('')
  // Set aside under is empty, which takes no value, and back once Tab moves
  // on or Backspace goes back to the operator it was typed under.
  const [held, setHeld] = useState<{
    text: string
    operator: ValueOperator
  } | null>(null)
  const [selected, setSelected] = useState<Selected | null>(null)
  const onFocusChange = use(SearchFocusContext)
  useEffect(() => whenIdle(RecordsDateCalendarLazy.preload), [])

  const byKey = new Map(fields.map((field) => [field.key, field]))
  // As the records apply it, so a scope they skip, such as a reversed range, shows.
  const skippedScope = useMemo(
    () =>
      applyQuery(
        { search: '', filters: [...records.scope], sort: [] },
        records.fields,
        { now: records.now, timeZone: records.timeZone }
      ).skippedFilters,
    [records.scope, records.fields, records.now, records.timeZone]
  )
  const pendingField = pending ? byKey.get(pending) : undefined
  const options = { now: records.now, timeZone: records.timeZone }
  const context: SearchContext = {
    ...options,
    fields,
    filters: [...records.scope, ...filters]
  }
  const chipIds = filterChipIds(filters)
  const chips = searchChips(
    {
      scope: records.scope,
      filters,
      skipped: records.skippedFilters,
      skippedScope
    },
    { ...options, fields }
  )

  /** Removes these filters, by index, last first so each index still holds. */
  function removeAt(indexes: readonly number[]) {
    for (const index of [...new Set(indexes)].sort((a, b) => b - a))
      records.removeFilter(index)
  }

  /** The filters another written at `at` rules out, such as values beside is empty. */
  const ruledOut = (filter: RecordFilter, at: number | null = null) =>
    filters.flatMap((other, index) =>
      index !== at && rulesOut(filter, other) ? [index] : []
    )

  /** Adds a filter in place of the first it rules out, or else last. Returns where. */
  function place(filter: RecordFilter): number {
    const [first, ...rest] = ruledOut(filter)
    if (first === undefined) {
      records.addFilter(filter)
      return filters.length
    }
    records.updateFilter(first, filter)
    removeAt(rest)
    return first
  }

  function add(filter: RecordFilter) {
    if (isApplied(filter, context.filters)) return
    const merged = mergeFilter(filters, filter, fields)
    if (merged) {
      if (!sameFilter(merged.filter, filters[merged.index]!))
        records.updateFilter(merged.index, merged.filter)
      removeAt(ruledOut(merged.filter, merged.index))
    } else if (!context.filters.some((other) => sameFilter(other, filter)))
      place(filter)
  }

  function endStep() {
    setSelected(null)
    setPending(null)
    setStepText('')
    setHeld(null)
  }

  const selectedAt = selected
    ? locate(filters, selected.index, selected.written)
    : null
  // The chip went, such as with its ✕ or the view replaced, so its step ends.
  if (selected && selectedAt === null) endStep()
  const selectedFilter =
    selectedAt === null ? undefined : selected?.written.at(-1)

  function selectChip(id: string) {
    const index = chipIds.indexOf(id)
    const filter = filters[index]
    const field = filter && byKey.get(filter.field)
    if (!field) return
    setSelected({ index, written: [filter] })
    setPending(field.key)
    setPendingOperator(stepOperator(field, filter.operator))
    setStepText(valueText(field, filter, context))
    setHeld(null)
  }

  function writeSelected(next: RecordFilter | null) {
    if (!selected || selectedAt === null) return
    if (next && selectedFilter && sameFilter(next, selectedFilter)) return
    const others = [
      ...records.scope,
      ...filters.filter((_, index) => index !== selectedAt)
    ]
    // Emptied of values, or now what another chip holds, it goes.
    if (!next || others.some((other) => sameFilter(other, next))) {
      records.removeFilter(selectedAt)
      endStep()
      return
    }
    // Is chips on one field AND, so one rewritten to is takes in the field's is chip.
    const merged = mergeFilter(
      filters.filter((_, index) => index !== selectedAt),
      next,
      fields
    )
    const filter = merged?.filter ?? next
    // `locate` finds the chip once the others' removal moves it.
    setSelected({ index: selectedAt, written: [...selected.written, filter] })
    records.updateFilter(selectedAt, filter)
    removeAt([
      ...ruledOut(filter, selectedAt),
      ...(merged
        ? [merged.index < selectedAt ? merged.index : merged.index + 1]
        : [])
    ])
  }

  function take(filter: RecordFilter) {
    if (!selectedFilter) {
      setPending(null)
      setStepText('')
      add(filter)
      return
    }
    // An option's values tick on and off; anything else holds one value,
    // so taking it ends the edit.
    const selectedField = byKey.get(selectedFilter.field)
    if (selectedField && isRecordOptionField(selectedField)) {
      writeSelected(toggleValue(selectedFilter, filter))
      return
    }
    writeSelected(filter)
    endStep()
  }

  function accept(suggestion: QueryFieldAccepted<SearchValue>) {
    if (suggestion.kind === 'search') {
      records.setSearch(suggestion.value)
      return
    }
    const value = suggestion.value
    if (value.type === 'filter') {
      take(value.filter)
      return
    }
    if (selectedFilter) return
    if (value.type === 'field') {
      const field = byKey.get(value.field)
      if (!field) return
      setStepText('')
      setPendingOperator(stepOperator(field, ''))
      setPending(field.key)
      return
    }
  }

  // The edited chip's filter stays out of the context, so its values still list.
  const stepValues = (text: string) =>
    pendingField
      ? valueSuggestions(
          pendingField,
          text,
          selectedAt === null
            ? context
            : {
                ...context,
                filters: [
                  ...records.scope,
                  ...filters.filter((_, index) => index !== selectedAt)
                ]
              },
          pendingOperator,
          selectedFilter
        )
      : []
  // Once a render, for the list, its hint, and the calendar's suggested days.
  const typedValues = stepValues(stepText)

  const chipId = selectedAt === null ? undefined : chipIds[selectedAt]
  const picking =
    pendingField && calendarOperator(pendingField, pendingOperator)
  const suggested =
    picking && stepText.trim() ? suggestedDays(typedValues) : undefined
  const content = (
    <QueryField<SearchValue>
      aria-label={label ?? placeholder}
      placeholder={placeholder}
      focusShortcut={focusShortcut || undefined}
      className={cn('min-w-0', className)}
      chips={chips}
      onRemoveChip={(id) => {
        const index = chipIds.indexOf(id)
        if (index >= 0) records.removeFilter(index)
      }}
      onClear={() => records.clearQuery()}
      onSelectChip={selectChip}
      pendingChip={
        pendingField
          ? {
              id: pendingField.key,
              // An option chip's values stay in it as they're ticked.
              label:
                (isRecordOptionField(pendingField) &&
                  selectedFilter &&
                  !isEmptiness(pendingOperator) &&
                  chips.find((chip) => chip.id === chipId)?.label) ||
                pendingLabel(pendingField, pendingOperator),
              operators: valueOperators(pendingField),
              operator: pendingOperator,
              hint:
                valueHint(pendingField, stepText, pendingOperator, context) ??
                // Not for the chip's own value as the edit opens: it's ticked.
                (selectedFilter &&
                stepText !== valueText(pendingField, selectedFilter, context)
                  ? heldHint(pendingField, stepText, typedValues)
                  : undefined),
              chipId,
              content: picking && (
                <RecordsDateCalendarLazy
                  key={`${chipId}\u0000${picking === 'between'}`}
                  field={pendingField}
                  operator={picking}
                  filter={selectedFilter}
                  onPick={take}
                  timeZone={records.timeZone}
                  today={plainDateOf(records.now, records.timeZone)}
                  suggested={suggested}
                />
              )
            }
          : undefined
      }
      onPendingOperatorChange={(chosen) => {
        if (!pendingField) return
        const operator = stepOperator(pendingField, chosen)
        setPendingOperator(operator)
        if (isEmptiness(operator)) {
          if (stepText) setHeld({ text: stepText, operator: pendingOperator })
          setStepText('')
        } else if (held) {
          if (!stepText) setStepText(held.text)
          setHeld(null)
        }
        // An option chip keeps its values under the new condition. Typed
        // text, numbers, and emptiness wait for Enter, so a Tab passing
        // through is empty never drops the values.
        if (
          isRecordOptionField(pendingField) &&
          !isEmptiness(operator) &&
          selectedFilter &&
          'values' in selectedFilter
        )
          writeSelected({
            ...selectedFilter,
            operator: optionOperator(operator)
          })
      }}
      onPendingChipCancel={endStep}
      onPendingChipBackspace={() => {
        if (held) {
          setPendingOperator(held.operator)
          setStepText(held.text)
          setHeld(null)
          return
        }
        if (selectedAt !== null) records.removeFilter(selectedAt)
        endStep()
      }}
      inputValue={pendingField ? stepText : records.searchText}
      onInputValueChange={(text) => {
        if (!pendingField) {
          records.setSearch(text)
          return
        }
        // Emptiness takes no value, so typing asks for one.
        const operator =
          isEmptiness(pendingOperator) && text.trim()
            ? stepOperator(pendingField, '')
            : pendingOperator
        setPendingOperator(operator)
        setHeld(null)
        setStepText(withAnd(pendingField, stepText, text, operator, context))
      }}
      suggest={(text) =>
        pendingField
          ? text === stepText
            ? typedValues
            : stepValues(text)
          : withFieldIcons(topSuggestions(text, context), byKey)
      }
      onAccept={accept}
    />
  )
  if (!onFocusChange) return content
  // React's focus events bubble out of the list's portal too.
  return (
    <div
      data-slot='records-search'
      className='contents'
      onFocus={(event) => {
        // Only as the toolbar's own child: inside a wrapper, the wrapper hides.
        if (
          event.currentTarget.parentElement?.dataset.slot === 'records-header'
        )
          onFocusChange(true)
      }}
      onBlur={() => onFocusChange(false)}
      onKeyDown={(event) => {
        // The rest show before Tab moves on, so focus lands on them rather than
        // past them. Committed and styled now: Firefox picks Tab's target
        // before a microtask would commit, from styles it hasn't recomputed.
        if (
          event.key === 'Tab' &&
          !event.defaultPrevented &&
          event.currentTarget.contains(event.target as Node)
        ) {
          flushSync(() => onFocusChange(false))
          void event.currentTarget.parentElement?.offsetWidth
        }
      }}
    >
      {content}
    </div>
  )
}
RecordsSearch.displayName = 'Records.Search'
