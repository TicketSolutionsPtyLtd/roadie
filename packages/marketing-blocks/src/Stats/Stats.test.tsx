import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Stats } from '.'
import { MarketingBlocksProvider } from '../Provider'

const facts = {
  title: 'By the numbers',
  description: 'The impact of genuine partnerships',
  items: [
    { value: '33,000,000+', label: 'tickets sold', illustration: 'Ticket' },
    { value: '22,000+', label: 'event organisers', illustration: 'MapPin' },
    { value: '20+', label: 'years in ticketing' }
  ]
} as const

describe('Stats', () => {
  it('names its section by the heading and describes it', () => {
    render(<Stats {...facts} />)

    const section = screen.getByRole('region', { name: 'By the numbers' })
    expect(
      within(section).getByRole('heading', { level: 2, name: 'By the numbers' })
    ).toBeInTheDocument()
    expect(
      within(section).getByText('The impact of genuine partnerships')
    ).toBeInTheDocument()
  })

  it('shows each value with its label, in order and as written', () => {
    render(<Stats {...facts} />)

    const items = screen.getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual([
      '33,000,000+tickets sold',
      '22,000+event organisers',
      '20+years in ticketing'
    ])
  })

  it('draws the named illustration beside a stat, hidden from assistive tech', () => {
    render(<Stats {...facts} />)

    const [ticket, , noIllustration] = screen.getAllByRole('listitem')
    expect(ticket!.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(noIllustration!.querySelector('svg')).toBeNull()
  })

  it('renders the figures preset of the typed-in variant', () => {
    render(<Stats {...facts} position={3} id='numbers' />)

    const section = screen.getByRole('region', { name: 'By the numbers' })
    expect(section).toHaveAttribute('data-block', 'stats')
    expect(section).toHaveAttribute('data-variant', 'typed-in')
    expect(section).toHaveAttribute('data-preset', 'figures')
    expect(section).toHaveAttribute('data-position', '3')
    expect(section).toHaveAttribute('id', 'numbers')
  })

  it('shows repeated stats once each, without a key clash', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const repeated = { value: '20+', label: 'years in ticketing' }
    render(<Stats title={facts.title} items={[repeated, repeated]} />)

    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('leaves the description out when there is none', () => {
    render(<Stats title={facts.title} items={facts.items} />)

    expect(screen.queryByText('The impact of genuine partnerships')).toBeNull()
  })

  it('reports no click on a stat, since a stat is not a control', async () => {
    const onBlockEvent = vi.fn()
    render(
      <MarketingBlocksProvider onBlockEvent={onBlockEvent}>
        <Stats {...facts} />
      </MarketingBlocksProvider>
    )

    await userEvent.click(screen.getByText('tickets sold'))

    expect(onBlockEvent).not.toHaveBeenCalled()
  })
})
