import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useCartDrawerDrag } from './useCartDrawerDrag'

describe('useCartDrawerDrag', () => {
  it('starts in the initial state', () => {
    const { result } = renderHook(() =>
      useCartDrawerDrag({ initialState: 'closed' })
    )
    expect(result.current.state).toBe('closed')
  })

  it('toggle flips the state', () => {
    const { result } = renderHook(() =>
      useCartDrawerDrag({ initialState: 'closed' })
    )
    act(() => result.current.toggle())
    expect(result.current.state).toBe('open')
    act(() => result.current.toggle())
    expect(result.current.state).toBe('closed')
  })

  it('setState sets the state directly', () => {
    const { result } = renderHook(() => useCartDrawerDrag())
    act(() => result.current.setState('open'))
    expect(result.current.state).toBe('open')
  })

  it('exposes measured header/footer defaults', () => {
    const { result } = renderHook(() => useCartDrawerDrag())
    expect(result.current.headerHeight).toBeGreaterThan(0)
    expect(result.current.footerHeight).toBeGreaterThan(0)
  })
})
