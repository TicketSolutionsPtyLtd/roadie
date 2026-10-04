'use client'

import { type RefObject, useLayoutEffect, useRef } from 'react'

import {
  RecordsConfirm,
  needsConfirm,
  reportActionError
} from './RecordsConfirm'
import { useRecordsContext } from './context'
import { deselect, pageState, withinMatching } from './selection'
import type { RecordName, RecordsBulkAction } from './types'

const count = new Intl.NumberFormat('en-AU')

/** Where focus lands once a bar that held it unmounts: the selection control, else the rows. */
const SURVIVOR = 'data-records-survivor'
const SCOPE = 'data-records-scope'

/** Marks an element focus can land on once the bulk actions bar goes. */
export function useSurvivor(kind: 'selection' | 'rows') {
  const { scope } = useRecordsContext()
  return { [SURVIVOR]: kind, [SCOPE]: scope }
}

const findSurvivor = (scope: string, kind: string) =>
  document.querySelector<HTMLElement>(
    `[${SCOPE}="${scope}"][${SURVIVOR}="${kind}"]`
  )

/** Hands focus to Select, else the rows, when an element holding it unmounts, such as a record's checkbox leaving Select mode. */
export function useKeepFocusOnLeave(ref: RefObject<HTMLElement | null>) {
  const { scope } = useRecordsContext()
  useLayoutEffect(() => {
    const element = ref.current
    return () => {
      if (!element?.contains(document.activeElement)) return
      ;(findSurvivor(scope, 'selection') ?? findSurvivor(scope, 'rows'))?.focus(
        {
          preventScroll: true
        }
      )
    }
  }, [ref, scope])
}

/** What the floating bar and the header bar share: running, confirming, and where focus goes once the bar unmounts. */
export function useBulkActions({
  actions,
  recordName: recordNameProp,
  barRef
}: {
  actions: readonly RecordsBulkAction[]
  recordName?: RecordName
  barRef: RefObject<HTMLElement | null>
}) {
  // Indexes, as a new actions array each render holds new objects.
  const {
    records,
    scope,
    bulkRunning: running,
    setBulkRunning: setRunning,
    bulkConfirming: confirming,
    setBulkConfirming: setConfirming,
    latestRecords: latest,
    queryRevision
  } = useRecordsContext()
  const selected = records.selectedCount
  const recordName = recordNameProp ?? records.recordName
  const noun = (n: number) => (n === 1 ? recordName.one : recordName.other)
  const pageIds = records.rows.map((row) => row.id)
  const offerAll =
    // Until a range list knows its total, every match is no known number.
    (records.range === undefined || records.range.total !== undefined) &&
    !('allMatching' in records.selection) &&
    pageState(records.selection, pageIds) === true &&
    records.resultCount > selected

  // The bar unmounts once the selection clears, taking any focus it held
  // with it. Land focus on something that survives, so it doesn't fall to <body>.
  // By scope, not by ancestor: under a Provider the parts sit apart.
  const focusSurvivor = () =>
    (findSurvivor(scope, 'selection') ?? findSurvivor(scope, 'rows'))?.focus()
  // A bar the selection clears in render, such as a new search, unmounts with
  // focus inside; this runs before its nodes leave.
  const latestFocus = useRef(focusSurvivor)
  useLayoutEffect(() => {
    latestFocus.current = focusSurvivor
  })
  useLayoutEffect(
    () => () => {
      if (barRef.current?.contains(document.activeElement))
        latestFocus.current()
    },
    [barRef]
  )
  const clearSelection = () => {
    focusSurvivor()
    records.clearSelection()
  }

  const run = async (index: number) => {
    const action = actions[index]
    if (!action) return
    const server = records.mode !== 'browser'
    const matchingIds = records.matchingRows.map((row) => row.id)
    // The server decides what matches; in the browser a hidden record is never acted on.
    const submitted = server
      ? records.selection
      : withinMatching(records.selection, matchingIds)
    const except = new Set('allMatching' in submitted ? submitted.except : [])
    const acted = new Set(
      'allMatching' in submitted
        ? matchingIds.filter((id) => !except.has(id))
        : submitted.ids
    )
    const query = records.scopedQuery
    const revision = queryRevision.current.count
    setRunning(index)
    try {
      await action.onAction(submitted, query)
      const current = latest.current
      // A selection taken against a newer query isn't what the action took.
      if (server && queryRevision.current.count !== revision) return
      // Records ticked while the action ran, which it never touched, stay
      // selected. An action on every match took them all.
      const rest =
        server && 'allMatching' in submitted
          ? { ids: submitted.except.filter((id) => current.isSelected(id)) }
          : 'allMatching' in current.selection && !server
            ? {
                ids: current.matchingRows
                  .map((row) => row.id)
                  .filter((id) => current.isSelected(id) && !acted.has(id))
              }
            : deselect(current.selection, [...acted])
      // Ids hidden by a query changed outside the records count for nothing.
      if (current.countSelection(rest) > 0) {
        current.setSelection(rest)
        return
      }
      if (barRef.current?.contains(document.activeElement)) focusSurvivor()
      if (current.selecting) current.setSelecting(false)
      else current.clearSelection()
    } catch (error) {
      reportActionError(error)
    } finally {
      setRunning(null)
    }
  }
  const start = (index: number) =>
    needsConfirm(actions[index]!) ? setConfirming(index) : void run(index)
  const confirmed = confirming === null ? undefined : actions[confirming]
  const confirm = confirming !== null && confirmed && (
    <RecordsConfirm
      action={confirmed}
      count={selected}
      recordName={recordName}
      onCancel={() => setConfirming(null)}
      onConfirm={() => {
        setConfirming(null)
        void run(confirming)
      }}
    />
  )

  return {
    records,
    running,
    start,
    confirm,
    clearSelection,
    offerAll,
    selectedLabel: `${count.format(selected)} selected`,
    allLabel: `Select all ${count.format(records.resultCount)} ${noun(records.resultCount)}`,
    allNoun: `${count.format(records.resultCount)} ${noun(records.resultCount)}`
  }
}
