import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Cards, type CardsItem } from '.'
import { BlocksProvider } from '../Provider'

const benefits: CardsItem[] = [
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

const values: CardsItem[] = [
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

describe('Cards', () => {
  it('names its section by the title and says its preset', () => {
    render(<Cards preset='photo' title='Our values' items={values} />)

    const section = screen.getByRole('region', { name: 'Our values' })
    expect(section).toHaveAttribute('data-block', 'cards')
    expect(section).toHaveAttribute('data-preset', 'photo')
  })

  it('renders cards by default, as a grid', () => {
    render(<Cards title='Great events need great partners' items={benefits} />)

    const section = screen.getByRole('region', {
      name: 'Great events need great partners'
    })
    expect(section).toHaveAttribute('data-preset', 'plain')
  })

  it.each(['plain', 'marked', 'overlap', 'photo'] as const)(
    'shows %s items as titled cards with their images',
    (preset) => {
      render(<Cards preset={preset} title='Section' items={values} />)

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

  it.each(['plain', 'marked', 'overlap'] as const)(
    'shows each %s item’s description',
    (preset) => {
      render(<Cards preset={preset} title='Section' items={values} />)

      expect(screen.getByText('We love what we do.')).toBeInTheDocument()
    }
  )

  it('shows photo cards by title and subtitle, leaving out descriptions', () => {
    render(<Cards preset='photo' title='Leadership' items={values} />)

    expect(
      screen.getByRole('heading', { level: 3, name: 'Positive energy' })
    ).toBeInTheDocument()
    expect(screen.getByText('Lift spirits')).toBeInTheDocument()
    expect(screen.queryByText('We love what we do.')).not.toBeInTheDocument()
  })

  it('renders the section heading with its eyebrow, highlight, and description', () => {
    render(
      <Cards
        preset='overlap'
        eyebrow='How does Oztix partner?'
        title='We understand your industry'
        highlight='industry'
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
      <Cards preset='plain' title='Section' items={benefits} />
    )

    const illustrations = container.querySelectorAll('svg[aria-hidden="true"]')
    expect(illustrations).toHaveLength(2)
  })

  it('lists each column’s points under its title, with no images', () => {
    render(
      <Cards
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
      <Cards
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
      <BlocksProvider
        renderImage={({ alt }) => <img alt={alt} src='/optimised.webp' />}
      >
        <Cards preset='photo' title='Leadership' items={values} />
      </BlocksProvider>
    )

    expect(
      screen.getByRole('img', { name: 'A team at a desk' })
    ).toHaveAttribute('src', '/optimised.webp')
  })

  it.each(['plain', 'marked', 'overlap', 'photo', 'lists'] as const)(
    'links a %s card by its title and reports the title alone as the click label',
    async (preset) => {
      const onBlockEvent = vi.fn()
      render(
        <BlocksProvider onBlockEvent={onBlockEvent}>
          <Cards
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
        </BlocksProvider>
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
      <BlocksProvider onBlockEvent={onBlockEvent}>
        <Cards
          preset='marked'
          title='Our partnership services'
          items={values}
          actions={[
            { label: 'See all services', href: '/services' },
            { label: 'Talk to us', href: '/contact' }
          ]}
        />
      </BlocksProvider>
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

  it('numbers cards as an ordered list, in order, when numbered', () => {
    render(
      <Cards
        preset='plain'
        numbered
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

  it('lists cards unordered unless numbered', () => {
    render(<Cards title='Section' items={values} />)

    expect(screen.getByRole('list').tagName).toBe('UL')
  })

  it('sets an illustration above the title of a card with no image', () => {
    const { container } = render(
      <Cards
        title='How can we help?'
        items={[
          {
            title: 'New clients',
            description: 'Chat to us about your venue or event.',
            illustration: 'Hand',
            href: '/contact/sales'
          }
        ]}
      />
    )

    const illustration = container.querySelector('li svg[aria-hidden="true"]')!
    expect(
      illustration.compareDocumentPosition(
        screen.getByRole('heading', { level: 3 })
      ) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()

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
    const surfaceOf = () =>
      screen.getByRole('region').querySelector('[data-slot="block-surface"]')

    it('gives its strong action the block’s intent', () => {
      render(
        <Cards
          intent='brand'
          title='Section'
          items={values}
          actions={[{ label: 'See them all', href: '/all' }]}
        />
      )

      expect(screen.getByRole('link', { name: 'See them all' })).toHaveClass(
        'intent-brand'
      )
    })

    it('sets the block’s intent on its section', () => {
      render(<Cards intent='brand' title='Section' items={values} />)

      const section = screen.getByRole('region', { name: 'Section' })
      expect(section).toHaveAttribute('data-intent', 'brand')
      expect(section).toHaveClass('intent-brand')
    })

    it.each([
      ['photo', undefined, 'emphasis-raised', 'panel'],
      ['plain', 'raised', 'emphasis-raised', 'band'],
      ['plain', 'subtle', 'emphasis-subtle', 'band'],
      ['marked', 'subtler', 'emphasis-subtler', 'band']
    ] as const)(
      'draws %s on a %s surface',
      (preset, emphasis, expected, shape) => {
        render(
          <Cards
            preset={preset}
            emphasis={emphasis}
            title='Section'
            items={values}
          />
        )

        expect(surfaceOf()).toHaveClass(expected)
        expect(surfaceOf()).toHaveAttribute('data-shape', shape)
      }
    )

    it.each([
      ['plain', true, 'panel'],
      ['photo', false, 'band']
    ] as const)(
      'draws %s with contained %s as a %s',
      (preset, contained, shape) => {
        render(
          <Cards
            preset={preset}
            emphasis='subtle'
            contained={contained}
            title='Section'
            items={values}
          />
        )

        expect(surfaceOf()).toHaveAttribute('data-shape', shape)
      }
    )

    it.each(['plain', 'marked', 'overlap', 'lists'] as const)(
      'draws no surface for %s unless one is set',
      (preset) => {
        render(<Cards preset={preset} title='Section' items={values} />)

        expect(surfaceOf()).toBeNull()
      }
    )

    it.each([
      ['plain', 'raised', 'emphasis-raised'],
      ['marked', 'subtle', 'emphasis-subtle'],
      ['plain', 'normal', 'emphasis-normal'],
      ['lists', 'subtler', 'emphasis-subtler']
    ] as const)('draws %s cards as %s', (preset, itemEmphasis, expected) => {
      render(
        <Cards
          preset={preset}
          itemEmphasis={itemEmphasis}
          title='Section'
          items={values}
        />
      )

      for (const card of cardsOf()) expect(card).toHaveClass(expected)
    })

    it.each([undefined, 'raised'] as const)(
      'inverts overlap-cards panels, with itemEmphasis %s',
      (itemEmphasis) => {
        render(
          <Cards
            preset='overlap'
            itemEmphasis={itemEmphasis}
            title='Section'
            items={values}
          />
        )

        for (const heading of screen.getAllByRole('heading', { level: 3 }))
          expect(heading.parentElement).toHaveClass('emphasis-inverted')
      }
    )

    it('draws numbered cards on their item emphasis', () => {
      render(
        <Cards numbered itemEmphasis='raised' title='Section' items={values} />
      )

      for (const card of cardsOf()) expect(card).toHaveClass('emphasis-raised')
    })

    it.each(['plain', 'marked', 'lists'] as const)(
      'gives a linked %s card with no surface the subtler one, and leaves the rest bare',
      (preset) => {
        render(
          <Cards
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
        <Cards
          title='Section'
          items={[{ ...values[0]!, intent: 'success' }, values[1]!]}
        />
      )

      const [tinted, plain] = cardsOf()
      expect(tinted).toHaveClass('intent-success')
      expect(plain!.className).not.toMatch(/intent-success/)
    })

    it('lets an item’s intent replace the cycling mark in overlap-cards', () => {
      render(
        <Cards
          preset='overlap'
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
    })

    const markOf = (name: string) =>
      screen.getByText(name).closest('[data-slot="mark"]')

    it.each([
      ['marked', false, 'info'],
      ['plain', true, 'brand-secondary']
    ] as const)(
      'marks %s (numbered: %s) in the block’s intent, an item’s own, or %s',
      (preset, numbered, fallback) => {
        const { unmount } = render(
          <Cards
            preset={preset}
            numbered={numbered}
            title='Section'
            items={values}
          />
        )
        const marked = numbered
          ? ['1', '2']
          : ['Proactive touch', 'Positive energy']
        for (const name of marked)
          expect(markOf(name)).toHaveClass(`intent-${fallback}`)
        unmount()

        render(
          <Cards
            preset={preset}
            numbered={numbered}
            intent='danger'
            title='Section'
            items={[values[0]!, { ...values[1]!, intent: 'success' }]}
          />
        )
        expect(markOf(marked[0]!)).toHaveClass('intent-danger')
        expect(markOf(marked[1]!)).toHaveClass('intent-success')
      }
    )

    it('marks every overlap-cards title in the block’s intent instead of cycling', () => {
      render(
        <Cards
          preset='overlap'
          intent='danger'
          title='Section'
          items={[
            values[0]!,
            values[1]!,
            { ...values[1]!, title: 'Third', intent: 'success' }
          ]}
        />
      )

      expect(markOf('Proactive touch')).toHaveClass('intent-danger')
      expect(markOf('Positive energy')).toHaveClass('intent-danger')
      expect(markOf('Third')).toHaveClass('intent-success')
    })

    it('marks a photo card’s subtitle, not its title, in the block’s or item’s intent', () => {
      render(
        <Cards
          preset='photo'
          intent='danger'
          title='Leadership'
          items={[values[0]!, { ...values[1]!, intent: 'success' }]}
        />
      )

      expect(markOf('See it coming')).toHaveClass('intent-danger')
      expect(markOf('Lift spirits')).toHaveClass('intent-success')
      expect(markOf('Proactive touch')).toHaveClass('intent-neutral')
    })
  })
})
