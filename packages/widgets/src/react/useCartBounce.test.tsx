import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useCartBounce } from './useCartBounce'

describe('useCartBounce', () => {
  it('does not bounce on the first value', () => {
    const onBounce = vi.fn()
    renderHook(({ count }) => useCartBounce(count, onBounce), {
      initialProps: { count: 2 }
    })
    expect(onBounce).not.toHaveBeenCalled()
  })

  it('bounces when the count increases', () => {
    const onBounce = vi.fn()
    const { rerender } = renderHook(
      ({ count }: { count: number }) => useCartBounce(count, onBounce),
      { initialProps: { count: 1 } }
    )
    rerender({ count: 3 })
    expect(onBounce).toHaveBeenCalledTimes(1)
  })

  it('does not bounce when the count decreases or holds', () => {
    const onBounce = vi.fn()
    const { rerender } = renderHook(
      ({ count }: { count: number }) => useCartBounce(count, onBounce),
      { initialProps: { count: 3 } }
    )
    rerender({ count: 2 })
    rerender({ count: 2 })
    expect(onBounce).not.toHaveBeenCalled()
  })
})
