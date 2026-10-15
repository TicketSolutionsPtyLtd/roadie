'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'

import { XIcon } from '@phosphor-icons/react'

import { plainDateOf } from '@oztix/roadie-core/datetime'
import type { RecordFilter } from '@oztix/roadie-core/records'
import { cn } from '@oztix/roadie-core/utils'

import {
  PHONE,
  PickerOverlay,
  usePickerSurface
} from '../../pickers/PickerShell'
import { useIsomorphicLayoutEffect } from '../../utils/useIsomorphicLayoutEffect'
import { IconButton } from '../Button/IconButton'
import { Popover } from '../Popover'
import { QueryField, type QueryFieldAccepted } from '../QueryField'
import { QueryFieldPanelContext } from '../QueryField/panel'
import {
  RecordsDatesPanelLazy,
  RecordsFilterEditorLazy
} from './RecordsFilterEditorLazy'
import { useRecordsContext } from './context'
import { fieldIcon } from './fieldIcon'
import { whenIdle } from './idle'
import { applyQuery } from './query'
import {
  type SearchContext,
  type SearchGroup,
  type SearchValue,
  type ValueOperator,
  filterChipIds,
  heldHint,
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

/** A chip whose values the value step edits in the list. */
type Selected = {
  index: number
  /** The filter as selected and each version written since, as with `Editing`. */
  written: RecordFilter[]
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
function useListedFields(records: RecordsInstance): readonly RecordsField[] {
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
 * Prototype (INNO-1278): below the phone breakpoint, inside an element marked
 * `data-custom-dates='inline'`, Custom dates shows a calendar in the dropdown
 * in place of the drawer. Only the docs' comparison sets it; whichever
 * surface loses is deleted, with this, before release.
 */
const INLINE_DATES = '[data-custom-dates=inline]'

/**
 * Search and filter in one field. Typing searches the records' searchable
 * fields and suggests filters, such as a city or "this weekend", that become
 * chips. Selecting a chip edits its values in the list, and Custom dates
 * opens an editor. The page's `scope` shows first, as locked chips.
 */
export function RecordsSearch({
  placeholder = 'Search and filter',
  'aria-label': label,
  shortcut = '/',
  className
}: RecordsSearchProps) {
  const { records, latestRecords } = useRecordsContext()
  const fields = useListedFields(records)
  const filters = records.view.query.filters
  const [pending, setPending] = useState<string | null>(null)
  const [pendingOperator, setPendingOperator] = useState<ValueOperator>('is')
  const [stepText, setStepText] = useState('')
  const [editing, setEditing] = useState<Editing | null>(null)
  const [selected, setSelected] = useState<Selected | null>(null)
  const [inlineDates, setInlineDates] = useState<Pick<
    Editing,
    'field' | 'index' | 'session'
  > | null>(null)
  // The filter whose chip takes focus once the dropdown's calendar closes.
  const focusOnChip = useRef<RecordFilter | null>(null)
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
    // Plain, as the server has no DOMRect.
    let last = {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    }
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
        if (element?.isConnected) {
          const { x, y, width, height, top, right, bottom, left } =
            element.getBoundingClientRect()
          last = { x, y, width, height, top, right, bottom, left }
        }
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
  const editingField = editing ? byKey.get(editing.field) : undefined
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

  const group = () =>
    inputRef.current?.closest<HTMLElement>('[data-slot=query-field]') ?? null

  const chipElement = (id: string) =>
    group()?.querySelector<HTMLElement>(
      `[data-slot=combobox-chip][data-chip-id="${CSS.escape(id)}"]`
    ) ?? null

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
      const now = latestRecords.current.view.query.filters
      // The chip may have gone while the editor loaded, as with Clear.
      const gone =
        next.index !== null &&
        !(opened && now.some((filter) => sameFilter(filter, opened)))
      if (ready && !gone && session === sessions.current)
        setEditing({
          ...next,
          written: opened ? [opened] : [],
          open: true,
          session
        })
    })
  }

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
    const merged = mergeFilter(filters, filter, fields)
    if (merged) {
      if (!sameFilter(merged.filter, filters[merged.index]!))
        records.updateFilter(merged.index, merged.filter)
      removeAt(ruledOut(merged.filter, merged.index))
    } else if (!context.filters.some((other) => sameFilter(other, filter)))
      place(filter)
  }

  // An editor waiting for its code gives way to whatever happens next.
  const dropOpening = () => ++sessions.current

  function endStep() {
    setInlineDates(null)
    setSelected(null)
    setPending(null)
    setStepText('')
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
    dropOpening()
    setSelected({ index, written: [filter] })
    setPending(field.key)
    setPendingOperator(stepOperator(field, filter.operator))
    setStepText(valueText(field, filter))
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

  function acceptForSelected(value: SearchValue, edited: RecordFilter) {
    if (value.type === 'filter') {
      // An option's values tick on and off; anything else holds one value,
      // so taking it ends the edit.
      if (byKey.get(edited.field)?.type === 'option') {
        writeSelected(toggleValue(edited, value.filter))
        return
      }
      writeSelected(value.filter)
      endStep()
      return
    }
    if (value.type === 'edit' && selectedAt !== null) {
      if (wantsInlineDates()) {
        openInlineDates({ field: value.field, index: selectedAt })
        return
      }
      const id = chipIds[selectedAt]!
      endStep()
      openEditor({ field: value.field, index: selectedAt }, chipElement(id))
    }
  }

  function accept(suggestion: QueryFieldAccepted<SearchValue>) {
    dropOpening()
    if (suggestion.kind === 'search') {
      records.setSearch(suggestion.value)
      return
    }
    const value = suggestion.value
    if (selectedFilter) {
      acceptForSelected(value, selectedFilter)
      return
    }
    if (value.type === 'field') {
      const field = byKey.get(value.field)
      if (!field) return
      setStepText('')
      setPendingOperator(stepOperator(field, ''))
      setPending(field.key)
      return
    }
    if (value.type === 'edit' && wantsInlineDates()) {
      openInlineDates({ field: value.field, index: null })
      return
    }
    setPending(null)
    setStepText('')
    if (value.type === 'edit')
      openEditor({ field: value.field, index: null }, group())
    else add(value.filter)
  }

  const wantsInlineDates = () =>
    window.matchMedia(PHONE).matches &&
    !!inputRef.current?.closest(INLINE_DATES)

  function openInlineDates(next: Pick<Editing, 'field' | 'index'>) {
    const session = ++sessions.current
    void RecordsFilterEditorLazy.preload().then((ready) => {
      if (ready && session === sessions.current)
        setInlineDates({ ...next, session })
    })
  }

  function takeInlineDates(filter: RecordFilter) {
    if (inlineDates?.index === null) add(filter)
    else writeSelected(filter)
    focusOnChip.current = filter
    endStep()
  }

  useIsomorphicLayoutEffect(() => {
    const filter = focusOnChip.current
    if (!filter) return
    focusOnChip.current = null
    const index = filters.findIndex((other) => sameFilter(other, filter))
    const id = chipIds[index]
    ;((id && chipElement(id)) || inputRef.current)?.focus()
  })

  const inlineDatesField = inlineDates && byKey.get(inlineDates.field)
  const datesPanel = inlineDates &&
    inlineDatesField && {
      content: (
        <RecordsDatesPanelLazy
          key={inlineDates.session}
          field={inlineDatesField}
          filter={(inlineDates.index !== null && selectedFilter) || null}
          timeZone={records.timeZone}
          today={plainDateOf(records.now, records.timeZone)}
          onChange={takeInlineDates}
        />
      ),
      onBack: () => setInlineDates(null)
    }

  /** Where the edited filter is now, or null for one not written yet. */
  function editingAt(): number | null {
    if (!editing || editing.index === null) return null
    const { written, index } = editing
    if (written.length === 0) return index < filters.length ? index : null
    const found = locate(filters, index, written)
    if (found !== null) return found
    // A new filter written but not shown yet.
    return !filters[index] && index === filters.length ? index : null
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
      removeAt(ruledOut(filter, at))
      return
    }
    const same = filters.findIndex((other) => sameFilter(other, filter))
    setEditing({
      ...editing,
      index: same >= 0 ? same : place(filter),
      written: [...editing.written, filter]
    })
  }

  function removeEdited() {
    if (!editing || at === null) return
    records.removeFilter(at)
    returnTo.current = null
    emptied.current = false
    setEditing({ ...editing, index: null, written: [], open: false })
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

  return (
    <QueryFieldPanelContext value={datesPanel || null}>
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
        onClear={() => {
          dropOpening()
          records.clearQuery()
        }}
        onSelectChip={selectChip}
        pendingChip={
          pendingField
            ? {
                id: pendingField.key,
                label: pendingLabel(pendingField, pendingOperator),
                operators: valueOperators(pendingField),
                operator: pendingOperator,
                hint:
                  valueHint(pendingField, stepText, pendingOperator, context) ??
                  (selectedFilter &&
                    heldHint(pendingField, stepText, stepValues(stepText))),
                chipId: selectedAt === null ? undefined : chipIds[selectedAt]
              }
            : undefined
        }
        onPendingOperatorChange={(chosen) => {
          if (!pendingField) return
          const operator = stepOperator(pendingField, chosen)
          setPendingOperator(operator)
          // An option chip keeps its values under the new condition. Typed
          // text, numbers, and emptiness wait for Enter, so a Tab passing
          // through is empty never drops the values.
          if (
            pendingField.type === 'option' &&
            !isEmptiness(operator) &&
            selectedFilter &&
            'values' in selectedFilter
          )
            writeSelected({
              ...selectedFilter,
              operator: optionOperator(operator)
            })
        }}
        onPendingChipCancel={() => {
          dropOpening()
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
          setStepText(withAnd(pendingField, stepText, text, operator, context))
        }}
        suggest={(text) =>
          pendingField
            ? stepValues(text)
            : withFieldIcons(topSuggestions(text, context), byKey)
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
          // Anchored to a chip, it has no trigger for Tab to go on from, so
          // focus stays inside, as in the drawer.
          modal='trap-focus'
          finalFocus={() => {
            const id = returnTo.current
            return (id && chipElement(id)) || inputRef.current
          }}
          className='w-80'
        >
          {/* The drawer has its own title and Close. */}
          {surface === 'popover' ? (
            <div className='flex items-center justify-between gap-2'>
              <Popover.Title id={labelId}>{editingField.label}</Popover.Title>
              {/* Base UI traps focus in a modal popover only with a Close. */}
              <Popover.Close
                render={
                  <IconButton aria-label='Close' size='sm' emphasis='subtler'>
                    <XIcon weight='bold' className='size-4' />
                  </IconButton>
                }
              />
            </div>
          ) : (
            <span id={labelId} hidden>
              {editingField.label}
            </span>
          )}
          <RecordsFilterEditorLazy
            key={editing.session}
            field={editingField}
            filter={editingFilter ?? null}
            timeZone={records.timeZone}
            today={plainDateOf(records.now, records.timeZone)}
            onEmptyChange={(empty) => {
              emptied.current = empty
            }}
            onChange={write}
            onRemove={at === null ? undefined : removeEdited}
          />
        </PickerOverlay>
      )}
    </QueryFieldPanelContext>
  )
}
RecordsSearch.displayName = 'Records.Search'
