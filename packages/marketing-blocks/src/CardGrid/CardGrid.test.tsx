import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
    render(
      <CardGrid preset='alternating-rows' title='Our values' items={values} />
    )

    const section = screen.getByRole('region', { name: 'Our values' })
    expect(section).toHaveAttribute('data-block', 'card-grid')
    expect(section).toHaveAttribute('data-preset', 'alternating-rows')
    expect(section).toHaveAttribute('data-variant', 'list')
  })

  it('renders features by default, as a grid', () => {
    render(
      <CardGrid title='Great events need great partners' items={benefits} />
    )

    const section = screen.getByRole('region', {
      name: 'Great events need great partners'
    })
    expect(section).toHaveAttribute('data-preset', 'illustrated-cards')
    expect(section).toHaveAttribute('data-variant', 'grid')
  })

  it.each([
    'illustrated-cards',
    'marked-cards',
    'overlap-cards',
    'alternating-rows',
    'portraits'
  ] as const)('shows %s items as titled cards with their images', (preset) => {
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
  })

  it.each([
    'illustrated-cards',
    'marked-cards',
    'overlap-cards',
    'numbered-cards',
    'link-cards',
    'alternating-rows'
  ] as const)('shows each %s item’s description', (preset) => {
    render(<CardGrid preset={preset} title='Section' items={values} />)

    expect(screen.getByText('We love what we do.')).toBeInTheDocument()
  })

  it('shows portraits by name and role, leaving out descriptions', () => {
    render(<CardGrid preset='portraits' title='Leadership' items={values} />)

    expect(
      screen.getByRole('heading', { level: 3, name: 'Positive energy' })
    ).toBeInTheDocument()
    expect(screen.getByText('Lift spirits')).toBeInTheDocument()
    expect(screen.queryByText('We love what we do.')).not.toBeInTheDocument()
  })

  it('renders the section heading with its eyebrow, highlight, and description', () => {
    render(
      <CardGrid
        preset='overlap-cards'
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
      <CardGrid preset='illustrated-cards' title='Section' items={benefits} />
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
        <CardGrid preset='portraits' title='Leadership' items={values} />
      </MarketingBlocksProvider>
    )

    expect(
      screen.getByRole('img', { name: 'A team at a desk' })
    ).toHaveAttribute('src', '/optimised.webp')
  })

  it.each([
    'illustrated-cards',
    'marked-cards',
    'overlap-cards',
    'alternating-rows',
    'portraits',
    'lists',
    'numbered-cards',
    'link-cards'
  ] as const)(
    'links a %s card by its title and reports the title alone as the click label',
    async (preset) => {
      const onBlockEvent = vi.fn()
      render(
        <MarketingBlocksProvider onBlockEvent={onBlockEvent}>
          <CardGrid
            preset={preset}
            title='We understand your industry'
            items={[
              {
                title: 'Live music',
                subtitle: 'Festivals, tours, and concerts',
                description: 'We sell millions of tickets each year.',
                illustration: 'NoteMusic',
                image: { src: '/music.jpg', alt: 'A festival main stage' },
                points: ['Festivals'],
                href: '/industries/live-music'
              },
              { title: 'Venues' }
            ]}
          />
        </MarketingBlocksProvider>
      )

      const link = screen.getByRole('link', { name: 'Live music' })
      expect(link).toHaveAttribute('href', '/industries/live-music')
      expect(
        screen.getByRole('heading', { level: 3, name: 'Live music' })
      ).toContainElement(link)
      expect(
        screen.queryByRole('link', { name: 'Venues' })
      ).not.toBeInTheDocument()

      await userEvent.click(link)
      expect(onBlockEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'click',
          label: 'Live music',
          href: '/industries/live-music'
        })
      )
    }
  )

  it('ends with its actions as links, the first one reported on click', async () => {
    const onBlockEvent = vi.fn()
    render(
      <MarketingBlocksProvider onBlockEvent={onBlockEvent}>
        <CardGrid
          preset='marked-cards'
          title='Our partnership services'
          items={values}
          actions={[
            { label: 'See all services', href: '/services' },
            { label: 'Talk to us', href: '/contact' }
          ]}
        />
      </MarketingBlocksProvider>
    )

    const links = screen.getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual([
      'See all services',
      'Talk to us'
    ])
    expect(links[0]).toHaveAttribute('href', '/services')
    expect(
      screen
        .getAllByRole('listitem')
        .at(-1)!
        .compareDocumentPosition(links[0]!) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()

    await userEvent.click(links[0]!)
    expect(onBlockEvent).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'See all services', href: '/services' })
    )
  })

  it('numbers steps as an ordered list, in order', () => {
    render(
      <CardGrid
        preset='numbered-cards'
        title='Make sure your show is seen'
        items={[
          {
            title: 'Name the artist',
            description: 'Spell it the same way every time.'
          },
          { title: 'Check the essentials' },
          { title: 'Mark tributes as tributes' }
        ]}
      />
    )

    const list = screen.getByRole('list')
    expect(list.tagName).toBe('OL')
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((step) => [
          step.querySelector('[aria-hidden="true"]')?.textContent,
          within(step).getByRole('heading', { level: 3 }).textContent
        ])
    ).toEqual([
      ['1', 'Name the artist'],
      ['2', 'Check the essentials'],
      ['3', 'Mark tributes as tributes']
    ])
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('shows links as titled cards, each with its illustration and no image', () => {
    const { container } = render(
      <CardGrid
        preset='link-cards'
        title='How can we help?'
        items={[
          {
            title: 'New clients',
            description: 'Chat to us about your venue or event.',
            illustration: 'Hand',
            image: { src: '/ignored.jpg', alt: 'Ignored' },
            href: '/contact/sales'
          }
        ]}
      />
    )

    expect(screen.getByRole('link', { name: 'New clients' })).toHaveAttribute(
      'href',
      '/contact/sales'
    )
    expect(
      screen.getByText('Chat to us about your venue or event.')
    ).toBeInTheDocument()
    expect(container.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(
      1
    )
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  describe('intent and emphasis', () => {
    const cardsOf = () =>
      within(screen.getAllByRole('list')[0]!).getAllByRole('listitem')

    it('sets the block’s intent on its section', () => {
      render(<CardGrid intent='brand' title='Section' items={values} />)

      const section = screen.getByRole('region', { name: 'Section' })
      expect(section).toHaveAttribute('data-intent', 'brand')
      expect(section).toHaveClass('intent-brand')
    })

    it.each([
      ['illustrated-cards', undefined, 'emphasis-raised'],
      ['portraits', undefined, 'emphasis-raised'],
      ['illustrated-cards', 'subtle', 'emphasis-subtle'],
      ['marked-cards', 'subtler', 'emphasis-subtler']
    ] as const)('draws %s on a %s surface', (preset, emphasis, expected) => {
      render(
        <CardGrid
          preset={preset}
          emphasis={emphasis}
          title='Section'
          items={values}
        />
      )

      expect(screen.getByRole('region').firstElementChild).toHaveClass(expected)
    })

    it('draws no section surface for presets without one', () => {
      render(<CardGrid preset='marked-cards' title='Section' items={values} />)

      expect(
        screen.getByRole('region').firstElementChild!.className
      ).not.toMatch(/emphasis-/)
    })

    it.each([
      ['link-cards', undefined, 'emphasis-raised'],
      ['marked-cards', 'subtle', 'emphasis-subtle'],
      ['illustrated-cards', 'normal', 'emphasis-normal'],
      ['numbered-cards', 'raised', 'emphasis-raised'],
      ['alternating-rows', 'subtle', 'emphasis-subtle'],
      ['lists', 'subtler', 'emphasis-subtler']
    ] as const)('draws %s cards as %s', (preset, cardEmphasis, expected) => {
      render(
        <CardGrid
          preset={preset}
          cardEmphasis={cardEmphasis}
          title='Section'
          items={values}
        />
      )

      for (const card of cardsOf()) expect(card).toHaveClass(expected)
    })

    it.each([
      'illustrated-cards',
      'marked-cards',
      'numbered-cards',
      'alternating-rows',
      'lists'
    ] as const)(
      'gives a linked %s card with no surface the subtler one, and leaves the rest bare',
      (preset) => {
        render(
          <CardGrid
            preset={preset}
            title='Section'
            items={[{ ...values[0]!, href: '/values/proactive' }, values[1]!]}
          />
        )

        const [linked, plain] = cardsOf()
        expect(linked).toHaveClass('emphasis-subtler')
        expect(plain!.className).not.toMatch(/emphasis-/)
        expect(plain!.querySelector('[data-interactive-target]')).toBeNull()
      }
    )

    it('tints a card in its item’s intent', () => {
      render(
        <CardGrid
          preset='link-cards'
          title='Section'
          items={[{ ...values[0]!, intent: 'success' }, values[1]!]}
        />
      )

      const [tinted, plain] = cardsOf()
      expect(tinted).toHaveClass('intent-success')
      expect(plain!.className).not.toMatch(/intent-success/)
    })

    it.each(['overlap-cards', 'alternating-rows'] as const)(
      'lets an item’s intent replace the cycling mark in %s',
      (preset) => {
        render(
          <CardGrid
            preset={preset}
            title='Section'
            items={[{ ...values[0]!, intent: 'success' }, values[1]!]}
          />
        )

        expect(
          screen.getByRole('heading', { level: 3, name: 'Proactive touch' })
        ).toHaveClass('intent-success')
        expect(
          screen.getByRole('heading', { level: 3, name: 'Positive energy' })
        ).toHaveClass('intent-brand')
      }
    )
  })
})
