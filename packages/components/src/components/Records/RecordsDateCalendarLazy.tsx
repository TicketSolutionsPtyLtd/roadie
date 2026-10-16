'use client'

import { useEffect, useState } from 'react'

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
export function RecordsDateCalendarLazy(props: RecordsDateCalendarProps) {
  const [ready, setReady] = useState(!!loaded)
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
  return Loaded ? <Loaded {...props} /> : null
}
/** Resolves true once the calendar can show; a failed load can be tried again. */
RecordsDateCalendarLazy.preload = load
