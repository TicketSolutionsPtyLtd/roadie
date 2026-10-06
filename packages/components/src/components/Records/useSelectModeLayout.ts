'use client'

import { useLayoutEffect, useRef } from 'react'

import { isSelecting, useRecordsContext } from './context'

/**
 * For a layout that selects only through Select mode while `active`, such as
 * a grid or a narrow table: enters it as a selection shows there, and leaves
 * it, keeping the selection, as the layout stops or unmounts. Only a switch
 * away leaves, so a second Content of another kind never fights it. Returns
 * whether Select mode shows.
 */
export function useSelectModeLayout(active: boolean) {
  const { records, setSelectMode } = useRecordsContext()
  const selecting = isSelecting(records, active)
  const { selecting: committed, setSelecting } = records
  const latest = useRef(records)
  useLayoutEffect(() => {
    latest.current = records
  })
  const wasActive = useRef(false)
  useLayoutEffect(() => {
    const left = wasActive.current && !active
    wasActive.current = active
    if (active && selecting && !committed) setSelecting(true, { keep: true })
    else if (left && committed) setSelecting(false, { keep: true })
    if (active) setSelectMode(true)
    else if (left) setSelectMode(false)
  }, [active, selecting, committed, setSelecting, setSelectMode])
  useLayoutEffect(
    () => () => {
      if (!wasActive.current) return
      setSelectMode(false)
      latest.current.setSelecting(false, { keep: true })
    },
    [setSelectMode]
  )
  return selecting
}
