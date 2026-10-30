import { render, screen } from '@testing-library/react'
import { describe, expect, it, onTestFinished } from 'vitest'
import { page, userEvent } from 'vitest/browser'

import { FAQ } from '.'
import {
  DESKTOP,
  PHONE,
  axeViolations,
  withBrowserPage
} from '../_test/browser'
import { MINIMUM_LC, textContrast, themes } from '../_test/contrast'

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

describe('FAQ', () => {
  it.each([
    ['a phone', PHONE],
    ['a desktop', DESKTOP]
  ])('lines the questions up with the heading on %s', async (_, size) => {
    await page.viewport(size.width, size.height)
    render(<FAQ title='Questions, answered' items={items} />)

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
      <FAQ title='Questions, answered' items={items} />
    )
    await userEvent.click(screen.getByText('Who do I contact?'))

    expect(await axeViolations(container)).toEqual([])
  })
})

describe('FAQ intent and emphasis', () => {
  const cases = themes.flatMap((theme) =>
    (['subtler', 'subtle', 'normal'] as const).flatMap((emphasis) =>
      (['neutral', 'brand', 'accent'] as const).map(
        (intent) => [emphasis, intent, theme] as const
      )
    )
  )

  it.each(cases)(
    'keeps its text readable on %s %s questions in %s mode',
    async (emphasis, intent, theme) => {
      document.documentElement.classList.toggle('dark', theme === 'dark')
      onTestFinished(() => document.documentElement.classList.remove('dark'))
      const { container } = render(
        <FAQ
          intent={intent}
          emphasis={emphasis}
          title='Questions, answered'
          items={items}
        />
      )
      await userEvent.click(screen.getByText('Does it cost anything?'))

      expect(
        textContrast(screen.getByRole('heading', { level: 2 }))
      ).toBeGreaterThanOrEqual(MINIMUM_LC.large)
      for (const element of [
        ...screen.getAllByRole('heading', { level: 3 }),
        screen.getByText(/settlement is unchanged/)
      ])
        expect(
          textContrast(element),
          element.textContent!
        ).toBeGreaterThanOrEqual(MINIMUM_LC.body)
      expect(await axeViolations(container)).toEqual([])
    }
  )
})
