import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DataCard } from '.'

describe('DataCard', () => {
  it('names the section by its label', () => {
    render(
      <DataCard label='Gross revenue' value={118400} format='compactCurrency' />
    )
    expect(
      screen.getByRole('region', { name: 'Gross revenue' })
    ).toBeInTheDocument()
    expect(screen.getByText('$118.4k')).toBeInTheDocument()
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
    expect(screen.getByRole('region', { name: 'Sales pace' })).toHaveAttribute(
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
})
