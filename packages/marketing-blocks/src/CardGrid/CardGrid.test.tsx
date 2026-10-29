import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CardGrid, type CardGridItem } from '.'
import { MarketingBlocksProvider } from '../Provider'

const benefits: CardGridItem[] = [
  {
    title: 'You sell more tickets',
    description: 'Marketing that drives attendance.',
    illustration: 'Ticket',
    image: { src: '/crowd.jpg', alt: 'A crowd at a gig' }
  },
  {
    title: 'Your events run smoothly',
    description: 'Specialists behind every decision.',
    illustration: 'Heart',
    image: { src: '/entry.jpg', alt: 'A ticket scanned at the door' }
  }
]

const values: CardGridItem[] = [
  {
    title: 'Proactive touch',
    subtitle: 'See it coming',
    description: 'We spot issues early.',
    image: { src: '/one.jpg', alt: 'A team at a desk' }
  },
  {
    title: 'Positive energy',
    subtitle: 'Lift spirits',
    description: 'We love what we do.',
    image: { src: '/two.jpg', alt: 'Three partners smiling' }
  }
]

describe('CardGrid', () => {
  it('names its section by the title and says its preset and variant', () => {
    render(<CardGrid preset='values' title='Our values' items={values} />)

    const section = screen.getByRole('region', { name: 'Our values' })
    expect(section).toHaveAttribute('data-block', 'card-grid')
    expect(section).toHaveAttribute('data-preset', 'values')
    expect(section).toHaveAttribute('data-variant', 'list')
  })

  it('renders features by default, as a grid', () => {
    render(
      <CardGrid title='Great events need great partners' items={benefits} />
    )

    const section = screen.getByRole('region', {
      name: 'Great events need great partners'
    })
    expect(section).toHaveAttribute('data-preset', 'features')
    expect(section).toHaveAttribute('data-variant', 'grid')
  })

  it.each(['features', 'services', 'industries', 'values', 'team'] as const)(
    'shows %s items as titled cards with their images',
    (preset) => {
      render(<CardGrid preset={preset} title='Section' items={values} />)

      const list = screen.getByRole('list')
      expect(within(list).getAllByRole('listitem')).toHaveLength(2)
      expect(
        screen.getByRole('heading', { level: 3, name: 'Proactive touch' })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('img', { name: 'Three partners smiling' })
      ).toHaveAttribute('src', '/two.jpg')
      expect(screen.getByText('Lift spirits')).toBeInTheDocument()
    }
  )

  it.each(['features', 'services', 'industries', 'values'] as const)(
    'shows each %s item’s description',
    (preset) => {
      render(<CardGrid preset={preset} title='Section' items={values} />)

      expect(screen.getByText('We love what we do.')).toBeInTheDocument()
    }
  )

  it('shows team members by name and role, leaving out descriptions', () => {
    render(<CardGrid preset='team' title='Leadership' items={values} />)

    expect(
      screen.getByRole('heading', { level: 3, name: 'Positive energy' })
    ).toBeInTheDocument()
    expect(screen.getByText('Lift spirits')).toBeInTheDocument()
    expect(screen.queryByText('We love what we do.')).not.toBeInTheDocument()
  })

  it('renders the section heading with its eyebrow, highlight, and description', () => {
    render(
      <CardGrid
        preset='industries'
        eyebrow='How does Oztix partner?'
        title='We understand your industry'
        titleHighlight='industry'
        description='And what makes events succeed.'
        items={values}
      />
    )

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'We understand your industry'
      })
    ).toBeInTheDocument()
    expect(screen.getByText('industry').closest('mark')).toBeInTheDocument()
    expect(screen.getByText('How does Oztix partner?')).toBeInTheDocument()
    expect(
      screen.getByText('And what makes events succeed.')
    ).toBeInTheDocument()
  })

  it('draws each named illustration, hidden from assistive tech', () => {
    const { container } = render(
      <CardGrid preset='features' title='Section' items={benefits} />
    )

    const illustrations = container.querySelectorAll('svg[aria-hidden="true"]')
    expect(illustrations).toHaveLength(2)
  })

  it('lists each column’s points under its title, with no images', () => {
    render(
      <CardGrid
        preset='lists'
        title='Social and corporate governance'
        items={[
          {
            title: 'Security and compliance',
            points: ['ISO 9001:2015 certified', '99.99% SLA uptime'],
            image: { src: '/ignored.jpg', alt: 'Ignored' }
          },
          { title: 'Environmental responsibility', points: ['Less waste'] }
        ]}
      />
    )

    const column = screen.getByRole('heading', {
      level: 3,
      name: 'Security and compliance'
    }).parentElement!
    expect(
      within(column)
        .getAllByRole('listitem')
        .map((item) => item.textContent)
    ).toEqual(['ISO 9001:2015 certified', '99.99% SLA uptime'])
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('keeps repeated points and items apart', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <CardGrid
        preset='lists'
        title='Policies'
        items={[
          { title: 'Policies', points: ['Reviewed yearly', 'Reviewed yearly'] },
          { title: 'Policies', points: ['Reviewed yearly'] }
        ]}
      />
    )

    expect(screen.getAllByText('Reviewed yearly')).toHaveLength(3)
    expect(
      error.mock.calls.filter(([message]) => String(message).includes('key'))
    ).toEqual([])
    error.mockRestore()
  })

  it("draws images with the provider's renderImage", () => {
    render(
      <MarketingBlocksProvider
        renderImage={({ alt }) => <img alt={alt} src='/optimised.webp' />}
      >
        <CardGrid preset='team' title='Leadership' items={values} />
      </MarketingBlocksProvider>
    )

    expect(
      screen.getByRole('img', { name: 'A team at a desk' })
    ).toHaveAttribute('src', '/optimised.webp')
  })
})
