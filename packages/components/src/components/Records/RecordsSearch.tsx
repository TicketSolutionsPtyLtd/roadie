'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'

import type { RecordField, RecordFilter } from '@oztix/roadie-core/records'
import { cn } from '@oztix/roadie-core/utils'

import { PickerOverlay, usePickerSurface } from '../../pickers/PickerShell'
import { useIsomorphicLayoutEffect } from '../../utils/useIsomorphicLayoutEffect'
import { QueryField, type QueryFieldAccepted } from '../QueryField'
import { RecordsFilterEditorLazy } from './RecordsFilterEditorLazy'
import { useRecordsContext } from './context'
import { whenIdle } from './idle'
import {
  type SearchContext,
  type SearchValue,
  filterChipIds,
  hasValueStep,
  mergeFilter,
  sameFilter,
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
  /**
   * The filter as opened and each version written since, to find it again
   * if the list moves under it or a parent shows a write late.
   */
  written: RecordFilter[]
  /** Each opening edits afresh. */
  session: number
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
function useListedFields(records: RecordsInstance): readonly RecordField[] {
  const { data, fields, mode } = records
  return useMemo(() => {
    if (mode !== 'browser') return fields
    return fields.map((field) => {
      if (field.type !== 'option' || field.options || field.status) return field
      const values = heldValues(data, field.key)
      if (!values) return field
      const options = values.map((value) => ({ value, label: value }))
      return { ...field, options }
    })
  }, [data, fields, mode])
}

const pendingLabel = (field: RecordField) =>
  field.type === 'date' ? field.label : `${field.label} is`

const FOCUSABLE = 'input:not([type=hidden]), button:not([tabindex="-1"])'

const focusTarget = (popup: HTMLElement) => {
  const marked = popup.querySelector<HTMLElement>('[data-filter-value]')
  const target = marked?.matches(FOCUSABLE)
    ? marked
    : marked?.querySelector<HTMLElement>(FOCUSABLE)
  return target ?? popup.querySelector<HTMLElement>(FOCUSABLE)
}

const focusPanel = (popup: HTMLElement) => popup

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
  const emptied = useRef(false)
  // Where focus returns as the editor closes: its chip, or the field.
  const returnTo = useRef<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const anchorRef = useRef<HTMLElement | null>(null)
  // A chip remounts as its filter changes, so the editor follows the chip
  // holding the filter now, by id.
  const anchorId = useRef<string | null>(null)
  const [anchor] = useState(() => {
    let last = new DOMRect()
    const current = () => {
      const held = anchorRef.current
      if (held?.isConnected || !anchorId.current) return held
      const found = held?.ownerDocument.querySelector<HTMLElement>(
        `[data-slot=combobox-chip][data-chip-id="${CSS.escape(anchorId.current)}"]`
      )
      if (found) anchorRef.current = found
      return found ?? held
    }
    return {
      getBoundingClientRect: () => {
        const element = current()
        if (element?.isConnected) last = element.getBoundingClientRect()
        return last
      },
      get contextElement() {
        return current() ?? undefined
      }
    }
  })
  const labelId = useId()
  const editorOpen = editing?.open ?? false
  const surface = usePickerSurface(editorOpen)
  useEffect(() => whenIdle(RecordsFilterEditorLazy.preload), [])

  const byKey = new Map(fields.map((field) => [field.key, field]))
  const pendingField = pending ? byKey.get(pending) : undefined
  const editingField = editing ? byKey.get(editing.field) : undefined
  const options = { now: records.now, timeZone: records.timeZone }
  const context: SearchContext = {
    ...options,
    fields,
    filters: [...records.scope, ...filters]
  }
  const chipIds = filterChipIds(filters)
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
    anchorId.current = null
    returnTo.current = null
    const opened = next.index === null ? undefined : filters[next.index]
    emptied.current = false
    const session = ++sessions.current
    // Opens with its controls, so focus has somewhere to land.
    void RecordsFilterEditorLazy.preload().then((ready) => {
      if (ready && session === sessions.current)
        setEditing({
          ...next,
          written: opened ? [opened] : [],
          open: true,
          session
        })
    })
  }

  function add(filter: RecordFilter) {
    const merged = mergeFilter(filters, filter, fields)
    if (merged) {
      if (!sameFilter(merged.filter, filters[merged.index]!))
        records.updateFilter(merged.index, merged.filter)
    } else if (!filters.some((other) => sameFilter(other, filter)))
      records.addFilter(filter)
  }

  // An editor waiting for its code gives way to whatever happens next.
  const dropOpening = () => ++sessions.current

  function accept(suggestion: QueryFieldAccepted<SearchValue>) {
    dropOpening()
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

  /** Where the edited filter is now, or null for one not written yet. */
  function editingAt(): number | null {
    if (!editing || editing.index === null) return null
    const { written, index } = editing
    if (written.length === 0) return index < filters.length ? index : null
    const ours = (filter: RecordFilter) =>
      written.some((version) => sameFilter(filter, version))
    const held = filters[index]
    if (held && ours(held)) return index
    const found = filters.findIndex(ours)
    if (found >= 0) return found
    // A new filter written but not shown yet.
    return !held && index === filters.length ? index : null
  }
  const at = editingAt()
  useIsomorphicLayoutEffect(() => {
    if (editing?.open && at !== null) anchorId.current = chipIds[at] ?? null
  })
  // The filter went, such as with the view replaced, so its editor goes too.
  if (editing?.open && editing.written.length > 0 && at === null)
    setEditing({ ...editing, open: false })

  function closeEditor() {
    dropOpening()
    returnTo.current = at === null ? null : (chipIds[at] ?? null)
    // A filter emptied of its values is gone, as it now asks for nothing.
    if (emptied.current && at !== null) {
      records.removeFilter(at)
      returnTo.current = null
    }
    emptied.current = false
    setEditing((current) => current && { ...current, open: false })
  }

  const editingFilter = at === null ? undefined : filters[at]

  function write(filter: RecordFilter) {
    if (!editing) return
    if (at !== null) {
      setEditing({
        ...editing,
        index: at,
        written: [...editing.written, filter]
      })
      records.updateFilter(at, filter)
      return
    }
    const same = filters.findIndex((other) => sameFilter(other, filter))
    setEditing({
      ...editing,
      index: same >= 0 ? same : filters.length,
      written: [...editing.written, filter]
    })
    if (same < 0) records.addFilter(filter)
  }

  function removeEdited() {
    if (!editing || at === null) return
    records.removeFilter(at)
    returnTo.current = null
    emptied.current = false
    setEditing({ ...editing, index: null, written: [], open: false })
  }

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
          const index = chipIds.indexOf(id)
          if (index >= 0) records.removeFilter(index)
        }}
        onClear={records.clearQuery}
        onEditChip={(id, anchor) => {
          const index = chipIds.indexOf(id)
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
          dropOpening()
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
          anchor={anchor}
          aria-labelledby={labelId}
          labelSource={labelId}
          action='Edit filter'
          // A new filter takes its value at once; an existing one opens on
          // the panel, so no control looks active and Tab reaches the first.
          initialFocus={editing.index === null ? focusTarget : focusPanel}
          finalFocus={() => {
            const id = returnTo.current
            const chip =
              id &&
              group()?.querySelector<HTMLElement>(
                `[data-slot=combobox-chip][data-chip-id="${CSS.escape(id)}"]`
              )
            return chip || inputRef.current
          }}
          className='w-80'
        >
          <span id={labelId} hidden>
            {editingField.label}
          </span>
          <RecordsFilterEditorLazy
            key={editing.session}
            field={editingField}
            filter={editingFilter ?? null}
            timeZone={records.timeZone}
            onEmptyChange={(empty) => {
              emptied.current = empty
            }}
            onChange={write}
            onRemove={at === null ? undefined : removeEdited}
          />
        </PickerOverlay>
      )}
    </>
  )
}
RecordsSearch.displayName = 'Records.Search'
