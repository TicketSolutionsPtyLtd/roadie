import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { FAQ } from '.'
import { MarketingBlocksProvider } from '../Provider'

const items = [
  {
    question: 'Does it cost anything?',
    answer: <p>No. There’s no fee, and your settlement is unchanged.</p>
  },
  {
    question: 'Who do I contact?',
    answer: (
      <p>
        Email <a href='mailto:admin@oztix.com.au'>admin@oztix.com.au</a>.
      </p>
    )
  }
]

describe('FAQ', () => {
  it('renders the heading and each question as a heading of its own', () => {
    render(
      <FAQ
        preset='faq'
        position={5}
        title='Questions, answered'
        items={items}
      />
    )

    const section = screen.getByRole('region', { name: 'Questions, answered' })
    expect(section).toHaveAttribute('data-block', 'faq')
    expect(section).toHaveAttribute('data-variant', 'accordion')
    expect(section).toHaveAttribute('data-preset', 'faq')
    expect(section).toHaveAttribute('data-position', '5')
    expect(
      screen
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent)
    ).toEqual(['Does it cost anything?', 'Who do I contact?'])
  })

  it('opens a question to its answer, set as prose', async () => {
    render(<FAQ title='Questions, answered' items={items} />)

    const question = screen
      .getByRole('heading', { name: 'Does it cost anything?' })
      .closest('details')!
    expect(question).not.toHaveAttribute('open')

    await userEvent.click(screen.getByText('Does it cost anything?'))

    expect(question).toHaveAttribute('open')
    const answer = screen.getByText(
      'No. There’s no fee, and your settlement is unchanged.'
    )
    expect(answer.closest('.prose')).not.toBeNull()
  })

  it('reports a click on a link in an answer', async () => {
    const onBlockEvent = vi.fn()
    render(
      <MarketingBlocksProvider onBlockEvent={onBlockEvent}>
        <FAQ position={2} title='Questions, answered' items={items} />
      </MarketingBlocksProvider>
    )

    await userEvent.click(screen.getByText('Who do I contact?'))
    await userEvent.click(
      screen.getByRole('link', { name: 'admin@oztix.com.au' })
    )

    expect(onBlockEvent).toHaveBeenCalledWith({
      action: 'click',
      block: 'faq',
      variant: 'accordion',
      preset: 'faq',
      position: 2,
      label: 'admin@oztix.com.au',
      href: 'mailto:admin@oztix.com.au'
    })
  })

  it('lists a question twice when it’s asked twice', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const repeated = [items[0]!, items[0]!]
    const { rerender } = render(<FAQ title='Questions' items={repeated} />)
    rerender(<FAQ title='Questions' items={[...repeated, items[1]!]} />)

    expect(
      screen.getAllByRole('heading', { name: 'Does it cost anything?' })
    ).toHaveLength(2)
    expect(error).not.toHaveBeenCalled()
    error.mockRestore()
  })

  it('links on from under the questions', () => {
    render(
      <FAQ
        title='Questions, answered'
        items={items}
        actions={[
          { label: 'See all FAQs', href: '/frequently-asked-questions' }
        ]}
      />
    )

    const link = screen.getByRole('link', { name: 'See all FAQs' })
    expect(link).toHaveAttribute('href', '/frequently-asked-questions')
    expect(
      screen
        .getByRole('heading', { name: 'Who do I contact?' })
        .compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })
})
