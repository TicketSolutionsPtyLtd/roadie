import type { ReactElement } from 'react'

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Skeleton } from '.'

function renderSkeleton(ui: ReactElement) {
  const { container, rerender } = render(ui)
  const get = () => container.querySelector('[data-slot="skeleton"]')
  return { get, rerender, container }
}

describe('Skeleton', () => {
  it('marks itself as a skeleton so surrounding components can detect it', () => {
    const { get } = renderSkeleton(<Skeleton />)
    expect(get()).toBeInTheDocument()
  })

  it('hides itself from the accessibility tree', () => {
    const { get } = renderSkeleton(<Skeleton />)
    expect(get()).toHaveAttribute('aria-hidden', 'true')
  })

  it('announces nothing, so a labelled region can own the loading state', () => {
    const { getByRole, queryByText } = render(
      <div role='status' aria-busy='true' aria-label='Loading events'>
        <Skeleton />
      </div>
    )
    expect(getByRole('status')).toHaveAccessibleName('Loading events')
    expect(queryByText(/loading/i)).not.toBeInTheDocument()
  })

  it('defaults to a single text line at the inherited line height', () => {
    const { get } = renderSkeleton(<Skeleton />)
    expect(get()).toHaveClass('h-[1lh]')
  })

  it('renders each shape', () => {
    const { get, rerender } = renderSkeleton(<Skeleton shape='block' />)
    expect(get()).toHaveClass('rounded-xl')

    rerender(<Skeleton shape='circle' />)
    expect(get()).toHaveClass('rounded-full')

    rerender(<Skeleton shape='text' />)
    expect(get()).toHaveClass('rounded-sm')
  })

  it('pulses with the shared motion utility rather than a raw duration', () => {
    const { get } = renderSkeleton(<Skeleton />)
    expect(get()).toHaveClass('animate-pulse-subtle')
  })

  it('takes no intent unless asked, so it inherits the one in context', () => {
    const { get, rerender } = renderSkeleton(<Skeleton />)
    expect(get()?.className).not.toMatch(/intent-/)

    rerender(<Skeleton intent='brand' />)
    expect(get()).toHaveClass('intent-brand')
  })

  it('renders emphasis variants', () => {
    const { get, rerender } = renderSkeleton(<Skeleton />)
    expect(get()).toHaveClass('emphasis-subtle')

    rerender(<Skeleton emphasis='subtler' />)
    expect(get()).toHaveClass('emphasis-subtler')
  })

  it('lets a consumer size it', () => {
    const { get } = renderSkeleton(
      <Skeleton shape='circle' className='size-6' />
    )
    expect(get()).toHaveClass('size-6')
    expect(get()).not.toHaveClass('size-10')
  })

  it('forwards attributes to the root', () => {
    const { get } = renderSkeleton(<Skeleton id='avatar-placeholder' />)
    expect(get()).toHaveAttribute('id', 'avatar-placeholder')
  })
})
