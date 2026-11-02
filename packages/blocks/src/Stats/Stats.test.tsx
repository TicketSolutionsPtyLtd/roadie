import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Stats } from '.'
import { BlocksProvider } from '../Provider'

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
      within(section).getByRole('heading', {
        level: 2,
        name: 'By the numbers'
      })
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

  it('renders the figures preset', () => {
    render(<Stats {...facts} position={3} id='numbers' />)

    const section = screen.getByRole('region', { name: 'By the numbers' })
    expect(section).toHaveAttribute('data-block', 'stats')
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
      <BlocksProvider onBlockEvent={onBlockEvent}>
        <Stats {...facts} />
      </BlocksProvider>
    )

    await userEvent.click(screen.getByText('tickets sold'))

    expect(onBlockEvent).not.toHaveBeenCalled()
  })

  it('sets the intent on the block, and draws no band by default', () => {
    render(<Stats {...facts} intent='brand' />)

    const section = screen.getByRole('region', { name: 'By the numbers' })
    expect(section).toHaveAttribute('data-intent', 'brand')
    expect(section.querySelector('[class*="emphasis-"]')).toBeNull()
  })

  it('draws the emphasis as a contained panel behind the figures by default', () => {
    render(<Stats {...facts} emphasis='subtle' />)

    const section = screen.getByRole('region', { name: 'By the numbers' })
    const surface = section.querySelector('[data-slot=block-surface]')
    expect(surface).toHaveClass('emphasis-subtle')
    expect(surface).toHaveAttribute('data-shape', 'panel')
    expect(surface).toContainElement(screen.getByText('33,000,000+'))
  })

  it('runs the emphasis full width as a band when not contained', () => {
    const { container } = render(
      <Stats {...facts} emphasis='raised' contained={false} />
    )

    expect(
      container.querySelector('[data-slot=block-surface]')
    ).toHaveAttribute('data-shape', 'band')
  })

  it('links on from under the figures', () => {
    render(
      <Stats
        {...facts}
        align='center'
        actions={[{ label: 'Talk to us', href: '/contact/sales' }]}
      />
    )

    const link = screen.getByRole('link', { name: 'Talk to us' })
    expect(link).toHaveAttribute('href', '/contact/sales')
    expect(
      screen.getByText('20+').compareDocumentPosition(link) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })
})
