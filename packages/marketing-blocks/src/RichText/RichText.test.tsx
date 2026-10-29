import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { RichText } from '.'
import { MarketingBlocksProvider } from '../Provider'
import { longForm, statement } from './fixtures'

describe('RichText', () => {
  describe('statement', () => {
    it('titles the section with an h2, marking the highlighted words', () => {
      render(<RichText {...statement} />)

      const heading = screen.getByRole('heading', {
        level: 2,
        name: statement.title
      })
      expect(screen.getByRole('region', { name: statement.title })).toBe(
        heading.closest('section')
      )
      expect(screen.getByText('Australian-owned').closest('mark')).not.toBe(
        null
      )
    })

    it('names the statement preset and the prose variant', () => {
      render(<RichText {...statement} position={3} />)

      const section = screen.getByRole('region')
      expect(section).toHaveAttribute('data-block', 'rich-text')
      expect(section).toHaveAttribute('data-variant', 'prose')
      expect(section).toHaveAttribute('data-preset', 'statement')
      expect(section).toHaveAttribute('data-position', '3')
    })

    it('shows each paragraph of the body in Prose, under a decorative illustration', () => {
      const { container } = render(<RichText {...statement} />)

      expect(screen.getByText(/largest independent ticketing/)).toBeVisible()
      expect(screen.getByText(/every size, stage and ambition/)).toBeVisible()
      expect(container.querySelector('.prose')).toContainElement(
        screen.getByText(/every size, stage and ambition/)
      )
      expect(container.querySelector('svg')).toHaveAttribute(
        'aria-hidden',
        'true'
      )
    })
  })

  describe('long-form', () => {
    it('sets the body in Prose under its title', () => {
      const { container } = render(<RichText {...longForm} />)

      expect(
        screen.getByRole('heading', { level: 2, name: 'How refunds work' })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('heading', { level: 3, name: 'Booking fees' })
      ).toBeInTheDocument()
      expect(container.querySelector('.prose')).toContainElement(
        screen.getByRole('link', { name: 'Read the refund policy' })
      )
      expect(container.querySelector('svg')).toBeNull()
      expect(screen.getByRole('region')).toHaveAttribute(
        'data-preset',
        'long-form'
      )
    })

    it('renders with no title, and no heading of its own', () => {
      render(<RichText {...longForm} title={undefined} />)

      expect(screen.queryByRole('heading', { level: 2 })).toBeNull()
      expect(screen.getByText(/every ticket is refunded/)).toBeInTheDocument()
    })

    it('keeps its eyebrow and description with no title', () => {
      render(
        <RichText
          {...longForm}
          title={undefined}
          eyebrow='Refunds'
          description='What happens to your tickets when plans change.'
        />
      )

      expect(screen.getByText('Refunds')).toBeInTheDocument()
      expect(
        screen.getByText('What happens to your tickets when plans change.')
      ).toBeInTheDocument()
    })

    it('reports a click on a link in the body through the provider', async () => {
      const onBlockEvent = vi.fn()
      render(
        <MarketingBlocksProvider onBlockEvent={onBlockEvent}>
          <RichText {...longForm} position={2} />
        </MarketingBlocksProvider>
      )

      await userEvent.click(
        screen.getByRole('link', { name: 'Read the refund policy' })
      )

      expect(onBlockEvent).toHaveBeenCalledWith({
        action: 'click',
        block: 'rich-text',
        variant: 'prose',
        preset: 'long-form',
        position: 2,
        label: 'Read the refund policy',
        href: '/refunds'
      })
    })
  })

  it.each(['statement', 'long-form'] as const)(
    'shows its actions as links after the body in %s, first one first',
    (preset) => {
      render(
        <RichText
          {...longForm}
          preset={preset}
          actions={[
            { label: 'Talk to us', href: '/contact/sales' },
            { label: 'Read our story', href: '/about' }
          ]}
        />
      )

      const actions = screen.getAllByRole('link', {
        name: /Talk to us|Read our story/
      })
      expect(actions.map((link) => link.getAttribute('href'))).toEqual([
        '/contact/sales',
        '/about'
      ])
      const body = screen.getByText(/every ticket is refunded/)
      expect(
        body.compareDocumentPosition(actions[0]!) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy()
    }
  )

  it('falls back to statement with no preset', () => {
    render(<RichText {...longForm} preset={undefined} />)

    expect(screen.getByRole('region')).toHaveAttribute(
      'data-preset',
      'statement'
    )
  })
})
