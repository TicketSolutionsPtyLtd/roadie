import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { FAQ } from '.'
import { BlocksProvider } from '../Provider'

const questions = [
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
        preset='accordion'
        position={5}
        title='Questions, answered'
        questions={questions}
      />
    )

    const section = screen.getByRole('region', { name: 'Questions, answered' })
    expect(section).toHaveAttribute('data-block', 'faq')
    expect(section).toHaveAttribute('data-preset', 'accordion')
    expect(section).toHaveAttribute('data-position', '5')
    expect(
      screen
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent)
    ).toEqual(['Does it cost anything?', 'Who do I contact?'])
  })

  it('opens a question to its answer, set as prose', async () => {
    render(<FAQ title='Questions, answered' questions={questions} />)

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
      <BlocksProvider onBlockEvent={onBlockEvent}>
        <FAQ position={2} title='Questions, answered' questions={questions} />
      </BlocksProvider>
    )

    await userEvent.click(screen.getByText('Who do I contact?'))
    await userEvent.click(
      screen.getByRole('link', { name: 'admin@oztix.com.au' })
    )

    expect(onBlockEvent).toHaveBeenCalledWith({
      action: 'click',
      block: 'faq',
      preset: 'accordion',
      position: 2,
      label: 'admin@oztix.com.au',
      href: 'mailto:admin@oztix.com.au'
    })
  })

  it('doesn’t report opening a question as a click', async () => {
    const onBlockEvent = vi.fn()
    render(
      <BlocksProvider onBlockEvent={onBlockEvent}>
        <FAQ title='Questions, answered' questions={questions} />
      </BlocksProvider>
    )

    await userEvent.click(screen.getByText('Who do I contact?'))

    expect(
      screen.getByRole('link', { name: 'admin@oztix.com.au' })
    ).toBeVisible()
    expect(onBlockEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: 'click' })
    )
  })

  it('lists a question twice when it’s asked twice', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const repeated = [questions[0]!, questions[0]!]
    const { rerender } = render(<FAQ title='Questions' questions={repeated} />)
    rerender(<FAQ title='Questions' questions={[...repeated, questions[1]!]} />)

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
        questions={questions}
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

  it('sets its intent on the block', () => {
    const { container } = render(
      <FAQ intent='brand' title='Questions, answered' questions={questions} />
    )

    expect(container.querySelector('section')).toHaveAttribute(
      'data-intent',
      'brand'
    )
  })

  it('draws the questions on a subtle surface when asked', () => {
    const { container } = render(
      <FAQ
        itemEmphasis='subtle'
        title='Questions, answered'
        questions={questions}
      />
    )

    expect(container.querySelectorAll('details.emphasis-subtle')).toHaveLength(
      2
    )
  })

  it('draws the questions in a bordered box when asked', () => {
    const { container } = render(
      <FAQ
        itemEmphasis='normal'
        title='Questions, answered'
        questions={questions}
      />
    )

    expect(container.querySelector('[data-slot=accordion]')).toHaveClass(
      'emphasis-normal'
    )
  })

  it('draws no surface by default', () => {
    const { container } = render(
      <FAQ title='Questions, answered' questions={questions} />
    )

    expect(
      container.querySelector('.emphasis-subtle, .emphasis-normal')
    ).toBeNull()
    expect(container.querySelector('[data-slot=block-surface]')).toBeNull()
  })

  it.each([
    [false, 'band'],
    [true, 'panel']
  ])(
    'draws its emphasis behind the block, contained %s, as a %s',
    (contained, shape) => {
      const { container } = render(
        <FAQ
          emphasis='subtle'
          contained={contained}
          title='Questions, answered'
          questions={questions}
        />
      )

      const surface = container.querySelector('[data-slot=block-surface]')
      expect(surface).toHaveClass('emphasis-subtle')
      expect(surface).toHaveAttribute('data-shape', shape)
      expect(surface).toContainElement(
        screen.getByRole('heading', { level: 2 })
      )
      expect(
        container.querySelectorAll('details.emphasis-subtle')
      ).toHaveLength(0)
    }
  )

  it('gives its strong action the block’s intent', () => {
    render(
      <FAQ
        intent='brand'
        title='Questions, answered'
        questions={questions}
        actions={[
          { label: 'See all FAQs', href: '/frequently-asked-questions' }
        ]}
      />
    )

    expect(screen.getByRole('link', { name: 'See all FAQs' })).toHaveClass(
      'intent-brand'
    )
  })
})
