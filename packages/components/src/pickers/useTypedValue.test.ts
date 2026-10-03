import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useTypedValue } from './useTypedValue'

type Span = { from: number; to: number }

const spanOptions = {
  format: (span: Span) => `${span.from}-${span.to}`,
  read: (text: string) => {
    const m = /^(\d+)-(\d+)$/.exec(text.trim())
    return m
      ? { value: { from: Number(m[1]), to: Number(m[2]) } }
      : text.trim()
        ? { error: 'Enter a span, like 1-3' }
        : { value: null }
  },
  isEqual: (a: Span | null, b: Span | null) =>
    a === b || (!!a && !!b && a.from === b.from && a.to === b.to)
}

describe('useTypedValue', () => {
  it('reads and formats any value type', () => {
    const onValueChange = vi.fn()
    const { result } = renderHook(() =>
      useTypedValue<Span>({
        value: undefined,
        defaultValue: { from: 1, to: 3 },
        onValueChange,
        ...spanOptions
      })
    )
    expect(result.current.text).toBe('1-3')
    act(() => result.current.setText('2-5'))
    act(() => {
      result.current.commit()
    })
    expect(onValueChange).toHaveBeenCalledWith({ from: 2, to: 5 })
    expect(result.current.text).toBe('2-5')
  })

  it('treats an equal value as no change', () => {
    const onValueChange = vi.fn()
    const { result } = renderHook(() =>
      useTypedValue<Span>({
        value: undefined,
        defaultValue: { from: 1, to: 3 },
        onValueChange,
        ...spanOptions
      })
    )
    act(() => result.current.setText(' 1-3 '))
    act(() => {
      result.current.commit()
    })
    expect(onValueChange).not.toHaveBeenCalled()
    expect(result.current.editing).toBe(false)
  })

  it('keeps the draft when a controlled parent echoes an equal object', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: Span | null }) =>
        useTypedValue<Span>({
          value,
          defaultValue: undefined,
          onValueChange: undefined,
          ...spanOptions
        }),
      { initialProps: { value: { from: 1, to: 3 } as Span | null } }
    )
    act(() => result.current.setText('4-'))
    rerender({ value: { from: 1, to: 3 } })
    expect(result.current.text).toBe('4-')
  })

  it('shows a falsy value', () => {
    const { result } = renderHook(() =>
      useTypedValue<number>({
        value: 0,
        defaultValue: undefined,
        onValueChange: undefined,
        format: (n) => `#${n}`,
        read: () => ({ value: 0 })
      })
    )
    expect(result.current.text).toBe('#0')
  })
})
