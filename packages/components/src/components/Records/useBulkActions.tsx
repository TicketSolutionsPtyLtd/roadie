'use client'

import type { RefObject } from 'react'

import {
  RecordsConfirm,
  needsConfirm,
  reportActionError
} from './RecordsConfirm'
import { useRecordsContext } from './context'
import { actionQuery } from './query'
import { deselect, pageState, withinMatching } from './selection'
import type { RecordName, RecordsBulkAction } from './types'

const count = new Intl.NumberFormat('en-AU')

/** Where focus lands once a bar that held it unmounts: the selection control, else the rows. */
export const SURVIVOR = 'data-records-survivor'

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
    bulkSlot,
    bulkRunning: running,
    setBulkRunning: setRunning,
    bulkConfirming: confirming,
    setBulkConfirming: setConfirming,
    latestRecords: latest
  } = useRecordsContext()
  const selected = records.selectedCount
  const recordName = recordNameProp ?? records.recordName
  const noun = (n: number) => (n === 1 ? recordName.one : recordName.other)
  const pageIds = records.rows.map((row) => row.id)
  const offerAll =
    !('allMatching' in records.selection) &&
    pageState(records.selection, pageIds) === true &&
    records.resultCount > selected

  // The bar unmounts once the selection clears, taking any focus it held
  // with it. Land focus on something that survives, so it doesn't fall to <body>.
  const survivor = () => {
    const bar = barRef.current
    const root =
      bar?.closest<HTMLElement>('[data-slot="records"]') ??
      bulkSlot?.closest<HTMLElement>('[data-records-content]')
    return (
      root?.querySelector<HTMLElement>(`[${SURVIVOR}="selection"]`) ??
      root?.querySelector<HTMLElement>(`[${SURVIVOR}="rows"]`)
    )
  }
  const focusSurvivor = () => survivor()?.focus()
  const clearSelection = () => {
    focusSurvivor()
    records.clearSelection()
  }

  const run = async (index: number) => {
    const action = actions[index]
    if (!action) return
    const matchingIds = records.matchingRows.map((row) => row.id)
    const submitted = withinMatching(records.selection, matchingIds)
    const except = new Set('allMatching' in submitted ? submitted.except : [])
    const acted = new Set(
      'allMatching' in submitted
        ? matchingIds.filter((id) => !except.has(id))
        : submitted.ids
    )
    setRunning(index)
    try {
      await action.onAction(submitted, actionQuery(records))
      const current = latest.current
      // Records ticked while the action ran, which it never touched, stay selected.
      const rest =
        'allMatching' in current.selection
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
