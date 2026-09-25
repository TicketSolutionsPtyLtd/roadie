import { createRef } from 'react'

import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { DataCard } from '.'

describe('DataCard', () => {
  it('names the card by its label', () => {
    render(
      <DataCard label='Gross revenue' value={118400} format='compactCurrency' />
    )
    expect(
      screen.getByRole('article', { name: 'Gross revenue' })
    ).toBeInTheDocument()
    expect(screen.getByText('$118.4k')).toBeInTheDocument()
  })

  it('is not a landmark, so cards can share a label', () => {
    render(
      <>
        <DataCard label='Tickets sold' value={1842} />
        <DataCard label='Tickets sold' value={612} />
      </>
    )
    expect(screen.queryAllByRole('region')).toHaveLength(0)
    expect(
      screen.getAllByRole('article', { name: 'Tickets sold' })
    ).toHaveLength(2)
  })

  it('keeps truncated copy available in the title', () => {
    render(
      <DataCard
        label='Tickets sold across all venues'
        context='On last week, before fees'
        value={1}
      />
    )
    expect(
      screen.getByRole('heading', { name: 'Tickets sold across all venues' })
    ).toHaveAttribute('title', 'Tickets sold across all venues')
    expect(screen.getByText('On last week, before fees')).toHaveClass(
      'truncate'
    )
  })

  it('shows a takeaway instead of a value', () => {
    render(
      <DataCard
        label='Upcoming shows'
        takeaway='Two shows are behind similar shows'
      />
    )
    expect(screen.getByText('Two shows are behind similar shows')).toHaveClass(
      'text-display-ui-6'
    )
  })

  it('renders loading skeletons with the real label', () => {
    const { container } = render(
      <DataCard label='Sales pace' state='loading' bodyHeight='220px' />
    )
    expect(screen.getByRole('article', { name: 'Sales pace' })).toHaveAttribute(
      'aria-busy',
      'true'
    )
    expect(
      container.querySelectorAll('[data-slot=skeleton]').length
    ).toBeGreaterThanOrEqual(3)
  })

  it('renders empty and error copy in place of the body', () => {
    const { rerender } = render(
      <DataCard label='Sales pace' state='empty'>
        <div>plot</div>
      </DataCard>
    )
    expect(
      screen.getByText(
        "We don't have data for this yet. You'll see it here once it arrives."
      )
    ).toBeInTheDocument()
    expect(screen.queryByText('plot')).toBeNull()
    rerender(
      <DataCard
        label='Sales pace'
        state='error'
        errorAction={<button type='button'>Retry</button>}
      />
    )
    expect(
      screen.getByText("We couldn't load sales pace. Try again in a minute.")
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('marks stale data in the footer', () => {
    render(
      <DataCard
        label='Sales pace'
        value={1}
        state='stale'
        staleLabel='As of 10:42am'
        source='Oztix sales.'
      />
    )
    expect(screen.getByText('As of 10:42am')).toBeInTheDocument()
  })

  it('renders fully on the server', () => {
    const html = renderToString(
      <DataCard
        label='Sold'
        value={1842}
        delta={{ value: 214 }}
        context='This week'
      />
    )
    expect(html).toContain('1,842')
    expect(html).toContain('up 214, better')
  })

  it('lowercases only the first letter of the label in error copy', () => {
    const { rerender } = render(<DataCard label='Pace for VIP' state='error' />)
    expect(
      screen.getByText("We couldn't load pace for VIP. Try again in a minute.")
    ).toBeInTheDocument()
    rerender(<DataCard label='GA sell-through' state='error' />)
    expect(
      screen.getByText(
        "We couldn't load GA sell-through. Try again in a minute."
      )
    ).toBeInTheDocument()
  })

  it('keeps its actions in every state, so refresh works on a failed card', () => {
    for (const state of ['ready', 'loading', 'empty', 'error'] as const) {
      const { unmount } = render(
        <DataCard
          label='Sales pace'
          state={state}
          actions={<DataCard.MoreButton label='Sales pace' />}
        />
      )
      expect(
        screen.getByRole('button', { name: 'More actions for Sales pace' })
      ).toBeInTheDocument()
      unmount()
    }
  })
})

describe('DataCard.MoreButton', () => {
  it('names itself for the card and passes props and ref through', () => {
    const ref = createRef<HTMLButtonElement>()
    const onClick = vi.fn()
    render(
      <DataCard.MoreButton
        label='Tickets sold'
        ref={ref}
        onClick={onClick}
        aria-haspopup='menu'
        aria-expanded={false}
      />
    )
    const button = screen.getByRole('button', {
      name: 'More actions for Tickets sold'
    })
    expect(ref.current).toBe(button)
    expect(button).toHaveAttribute('aria-haspopup', 'menu')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveClass('emphasis-subtler', 'btn-icon-sm')
    button.click()
    expect(onClick).toHaveBeenCalledOnce()
  })
})
