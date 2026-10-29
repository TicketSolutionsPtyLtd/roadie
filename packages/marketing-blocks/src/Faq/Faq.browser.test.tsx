import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'

import { Faq } from '.'
import {
  DESKTOP,
  PHONE,
  axeViolations,
  withBrowserPage
} from '../_test/browser'

withBrowserPage()

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

describe('Faq', () => {
  it.each([
    ['a phone', PHONE],
    ['a desktop', DESKTOP]
  ])('lines the questions up with the heading on %s', async (_, size) => {
    await page.viewport(size.width, size.height)
    render(<Faq title='Questions, answered' items={items} />)

    const heading = screen.getByRole('heading', { level: 2 })
    const question = screen.getByRole('heading', {
      name: 'Does it cost anything?'
    })
    expect(question.getBoundingClientRect().left).toBeCloseTo(
      heading.getBoundingClientRect().left,
      0
    )
  })

  it('has no axe violations, with a question open', async () => {
    const { container } = render(
      <Faq title='Questions, answered' items={items} />
    )
    await userEvent.click(screen.getByText('Who do I contact?'))

    expect(await axeViolations(container)).toEqual([])
  })
})
