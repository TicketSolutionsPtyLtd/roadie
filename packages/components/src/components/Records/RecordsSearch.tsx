'use client'

import { useId, useMemo, useRef, useState } from 'react'

import type { RecordField, RecordFilter } from '@oztix/roadie-core/records'
import { cn } from '@oztix/roadie-core/utils'

import { PickerOverlay, usePickerSurface } from '../../pickers/PickerShell'
import { useIsomorphicLayoutEffect } from '../../utils/useIsomorphicLayoutEffect'
import { QueryField, type QueryFieldAccepted } from '../QueryField'
import { RecordsFilterEditor } from './RecordsFilterEditor'
import { useRecordsContext } from './context'
import {
  type SearchContext,
  type SearchValue,
  chipIndex,
  filterChipId,
  hasValueStep,
  mergeFilter,
  searchChips,
  topSuggestions,
  valueSuggestions
} from './searchSuggestions'
import type { RecordsInstance } from './useRecords'

export type RecordsSearchProps = {
  /** @default 'Search and filter' */
  placeholder?: string
  /** Names the field. Defaults to the placeholder. */
  'aria-label'?: string
  /** A key that focuses the search from anywhere on the page, or `false` for none. @default '/' */
  shortcut?: string | false
  className?: string
}

type Editing = {
  field: string
  /** The filter's place in the view, or null until a new one is complete. */
  index: number | null
  /** Kept through the close, so the editor stays as it leaves. */
  open: boolean
  /** Each opening edits afresh. */
  session: number
}

const MAX_LISTED_VALUES = 200

// An option field with no `options` lists the values the records hold.
function useListedFields(records: RecordsInstance): readonly RecordField[] {
  const { data, fields, mode } = records
  return useMemo(() => {
    if (mode !== 'browser') return fields
    return fields.map((field) => {
      if (field.type !== 'option' || field.options || field.status) return field
      const values = new Set<string>()
      for (const row of data) {
        const value = (row as Record<string, unknown>)[field.key]
        for (const item of Array.isArray(value) ? value : [value])
          if (typeof item === 'string' && item.trim()) values.add(item)
        if (values.size > MAX_LISTED_VALUES) return field
      }
      const options = [...values]
        .sort((a, b) => a.localeCompare(b, 'en-AU'))
        .map((value) => ({ value, label: value }))
      return { ...field, options }
    })
  }, [data, fields, mode])
}

const pendingLabel = (field: RecordField) =>
  field.type === 'date' ? field.label : `${field.label} is`

const sameFilter = (a: RecordFilter, b: RecordFilter) =>
  JSON.stringify(a) === JSON.stringify(b)

const FOCUSABLE = 'input:not([type=hidden]), button:not([tabindex="-1"])'

const focusTarget = (popup: HTMLElement) => {
  const marked = popup.querySelector<HTMLElement>('[data-filter-value]')
  const target = marked?.matches(FOCUSABLE)
    ? marked
    : marked?.querySelector<HTMLElement>(FOCUSABLE)
  return target ?? popup.querySelector<HTMLElement>(FOCUSABLE)
}

/**
 * Search and filter in one field. Typing searches the records' searchable
 * fields and suggests filters, such as a city or "this weekend", that become
 * chips; a chip opens an editor for its operator and value. The page's
 * `scope` shows first, as locked chips.
 */
export function RecordsSearch({
  placeholder = 'Search and filter',
  'aria-label': label,
  shortcut = '/',
  className
}: RecordsSearchProps) {
  const { records } = useRecordsContext()
  const fields = useListedFields(records)
  const filters = records.view.query.filters
  const [pending, setPending] = useState<string | null>(null)
  const [stepText, setStepText] = useState('')
  const [editing, setEditing] = useState<Editing | null>(null)
  const sessions = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const anchorRef = useRef<HTMLElement | null>(null)
  const labelId = useId()
  const editorOpen = editing?.open ?? false
  const surface = usePickerSurface(editorOpen)

  const byKey = new Map(fields.map((field) => [field.key, field]))
  const pendingField = pending ? byKey.get(pending) : undefined
  const editingField = editing ? byKey.get(editing.field) : undefined
  const options = { now: records.now, timeZone: records.timeZone }
  const context: SearchContext = {
    ...options,
    fields,
    filters: [...records.scope, ...filters]
  }
  const chips = searchChips(
    { scope: records.scope, filters, skipped: records.skippedFilters },
    { ...options, fields }
  )

  const group = () =>
    inputRef.current?.closest<HTMLElement>('[data-slot=query-field]') ?? null

  function openEditor(
    next: Pick<Editing, 'field' | 'index'>,
    anchor: HTMLElement | null
  ) {
    anchorRef.current = anchor
    setEditing({ ...next, open: true, session: ++sessions.current })
  }

  function add(filter: RecordFilter) {
    const merged = mergeFilter(filters, filter, fields)
    if (merged) records.updateFilter(merged.index, merged.filter)
    else if (!filters.some((other) => sameFilter(other, filter)))
      records.addFilter(filter)
  }

  function accept(suggestion: QueryFieldAccepted<SearchValue>) {
    if (suggestion.kind === 'search') {
      records.setSearch(suggestion.value)
      return
    }
    const value = suggestion.value
    if (value.type === 'field') {
      const field = byKey.get(value.field)
      if (!field) return
      if (hasValueStep(field)) {
        setStepText('')
        setPending(field.key)
      } else openEditor({ field: field.key, index: null }, group())
      return
    }
    setPending(null)
    setStepText('')
    if (value.type === 'edit')
      openEditor({ field: value.field, index: null }, group())
    else add(value.filter)
  }

  const closeEditor = () =>
    setEditing((current) => current && { ...current, open: false })
  // Read at close, after a new filter got its place.
  const editingIndex = useRef<number | null>(null)
  useIsomorphicLayoutEffect(() => {
    editingIndex.current = editing?.index ?? null
  })

  const editingFilter =
    editing && editing.index !== null ? filters[editing.index] : undefined

  return (
    <>
      <QueryField<SearchValue>
        aria-label={label ?? placeholder}
        placeholder={placeholder}
        shortcut={shortcut || undefined}
        className={cn('min-w-0', className)}
        inputRef={inputRef}
        chips={chips}
        onRemoveChip={(id) => {
          const index = chipIndex(id)
          if (index >= 0) records.removeFilter(index)
        }}
        onClear={records.clearQuery}
        onEditChip={(id, anchor) => {
          const index = chipIndex(id)
          const filter = filters[index]
          if (filter && byKey.has(filter.field))
            openEditor({ field: filter.field, index }, anchor)
        }}
        pendingChip={
          pendingField
            ? { id: pendingField.key, label: pendingLabel(pendingField) }
            : undefined
        }
        onPendingChipCancel={() => {
          setPending(null)
          setStepText('')
        }}
        inputValue={pendingField ? stepText : records.view.query.search}
        onInputValueChange={(text) =>
          pendingField ? setStepText(text) : records.setSearch(text)
        }
        suggest={(text) =>
          pendingField
            ? valueSuggestions(pendingField, text, context)
            : topSuggestions(text, context)
        }
        onAccept={accept}
      />
      {editing && editingField && (
        <PickerOverlay
          open={editorOpen}
          onOpenChange={(open) => {
            if (!open) closeEditor()
          }}
          surface={surface}
          trigger={null}
          anchor={anchorRef}
          aria-labelledby={labelId}
          labelSource={labelId}
          action='Edit filter'
          initialFocus={focusTarget}
          finalFocus={() => {
            const index = editingIndex.current
            if (index === null) return inputRef.current
            return (
              group()?.querySelector<HTMLElement>(
                `[data-slot=combobox-chip][data-chip-id="${filterChipId(index)}"]`
              ) ?? inputRef.current
            )
          }}
          className='w-80'
        >
          <span id={labelId} hidden>
            {editingField.label}
          </span>
          <RecordsFilterEditor
            key={editing.session}
            field={editingField}
            filter={editingFilter ?? null}
            timeZone={records.timeZone}
            onChange={(filter) => {
              if (editing.index === null) {
                setEditing({ ...editing, index: filters.length })
                records.addFilter(filter)
              } else records.updateFilter(editing.index, filter)
            }}
            onRemove={
              editing.index === null
                ? undefined
                : () => {
                    records.removeFilter(editing.index!)
                    editingIndex.current = null
                    setEditing({ ...editing, index: null, open: false })
                  }
            }
          />
        </PickerOverlay>
      )}
    </>
  )
}
RecordsSearch.displayName = 'Records.Search'
