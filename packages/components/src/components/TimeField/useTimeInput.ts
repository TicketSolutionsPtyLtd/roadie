'use client'

import type { KeyboardEvent } from 'react'

import {
  type TypedValueOptions,
  useTypedValue
} from '../DateField/useTypedValue'
import { type HourCycle, formatTime, readTime, stepTime } from './readTime'

export type TimeInputOptions = Pick<
  TypedValueOptions,
  'value' | 'defaultValue' | 'onValueChange'
> & {
  hourCycle?: HourCycle
  minuteStep?: number
  locale?: string
  readOnly?: boolean
}

/** A typed time whose arrow keys step it by `minuteStep`. */
export function useTimeInput({
  hourCycle,
  minuteStep = 1,
  locale,
  readOnly,
  ...value
}: TimeInputOptions) {
  const typed = useTypedValue({
    ...value,
    format: (time) => formatTime(time, { hourCycle, locale }),
    read: (text) => readTime(text, { hourCycle, minuteStep })
  })

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (
      event.defaultPrevented ||
      readOnly ||
      event.nativeEvent.isComposing ||
      // Safari's composing keydown can say it isn't, but carries 229.
      event.keyCode === 229
    )
      return
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
    event.preventDefault()
    const base = typed.draftValue()
    if (base === undefined) typed.commit()
    else if (base) {
      typed.setValue(
        stepTime(base, event.key === 'ArrowUp' ? 1 : -1, minuteStep)
      )
    }
  }

  return { typed, onKeyDown }
}
