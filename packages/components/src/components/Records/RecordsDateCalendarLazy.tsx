'use client'

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import type { RecordFilter } from '@oztix/roadie-core/records'

import { useIsomorphicLayoutEffect } from '../../utils/useIsomorphicLayoutEffect'
import type { RecordsDateCalendarProps } from './RecordsDateCalendar'

type CalendarModule = typeof import('./RecordsDateCalendar')

let loaded: CalendarModule | undefined

const load = (): Promise<boolean> =>
  loaded
    ? Promise.resolve(true)
    : import('./RecordsDateCalendar').then(
        (module) => {
          loaded = module
          return true
        },
        () => false
      )

/**
 * A date step's calendar, loaded while the page is idle or as it's first
 * shown, so the calendar stays out of the records' first load. It shows once
 * it has loaded, so it never suspends and a failed load leaves typing working.
 */
export function RecordsDateCalendarLazy({
  onPick,
  suggested,
  ...props
}: RecordsDateCalendarProps) {
  const [ready, setReady] = useState(!!loaded)
  // Each keystroke brings a new onPick and suggested; held steady, the
  // calendar re-renders only when the suggested days change, and deferred,
  // after the typed text shows.
  const latestPick = useRef(onPick)
  useIsomorphicLayoutEffect(() => {
    latestPick.current = onPick
  })
  const pick = useCallback(
    (filter: RecordFilter) => latestPick.current(filter),
    []
  )
  const start = suggested?.start
  const end = suggested?.end
  const days = useDeferredValue(
    useMemo(() => (start && end ? { start, end } : undefined), [start, end])
  )
  useEffect(() => {
    if (ready) return
    let current = true
    void load().then((done) => {
      if (current && done) setReady(true)
    })
    return () => {
      current = false
    }
  }, [ready])
  const Loaded = ready ? loaded?.RecordsDateCalendar : undefined
  return Loaded ? <Loaded {...props} onPick={pick} suggested={days} /> : null
}
/** Resolves true once the calendar can show; a failed load can be tried again. */
RecordsDateCalendarLazy.preload = load
