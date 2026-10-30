import { render, screen } from '@testing-library/react'
import { describe, expect, it, onTestFinished } from 'vitest'
import { page, userEvent } from 'vitest/browser'

import { Accordion } from '@oztix/roadie-components/accordion'

import { FAQ, type FAQItemEmphasis } from '.'
import type { BlockEmphasis, BlockIntent } from '../_shared/surface'
import {
  DESKTOP,
  PHONE,
  axeViolations,
  centreOf,
  fontSizeOf,
  textAlignOf,
  withBrowserPage
} from '../_test/browser'
import { MINIMUM_LC, MODES, setMode, textContrast } from '../_test/contrast'

withBrowserPage()

const INTENTS = [
  'neutral',
  'brand',
  'brand-secondary',
  'brand-purple',
  'accent',
  'info',
  'success',
  'warning',
  'danger'
] as const satisfies readonly BlockIntent[]

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

describe('FAQ questions', () => {
  const rows = (root: Element) =>
    [...root.querySelectorAll('summary')].map((summary) =>
      summary.getBoundingClientRect()
    )

  it.each(['subtler', 'subtle', 'normal'] as const)(
    'spaces %s questions as Accordion does',
    async (itemEmphasis) => {
      await page.viewport(DESKTOP.width, DESKTOP.height)
      const { container } = render(
        <>
          <FAQ
            itemEmphasis={itemEmphasis}
            title='Questions, answered'
            items={items}
          />
          <Accordion emphasis={itemEmphasis}>
            {items.map(({ question, answer }) => (
              <Accordion.Item key={question}>
                <Accordion.Trigger>{question}</Accordion.Trigger>
                <Accordion.Content>{answer}</Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion>
        </>
      )

      const [faq, accordion] = [
        ...container.querySelectorAll('[data-slot=accordion]')
      ].map(rows)
      expect(faq![0]!.height).toBeCloseTo(accordion![0]!.height, 0)
      expect(faq![1]!.top - faq![0]!.bottom).toBeCloseTo(
        accordion![1]!.top - accordion![0]!.bottom,
        0
      )
    }
  )

  it.each(['subtle', 'normal'] as const)(
    'lines %s questions’ edges up with the heading',
    async (itemEmphasis) => {
      await page.viewport(DESKTOP.width, DESKTOP.height)
      const { container } = render(
        <FAQ
          itemEmphasis={itemEmphasis}
          title='Questions, answered'
          items={items}
        />
      )

      const heading = screen.getByRole('heading', { level: 2 })
      const edge = container.querySelector(
        itemEmphasis === 'normal'
          ? '[data-slot=accordion]'
          : '[data-slot=accordion-item]'
      )!
      expect(edge.getBoundingClientRect().left).toBeCloseTo(
        heading.getBoundingClientRect().left,
        0
      )
    }
  )
})

describe('FAQ align and size', () => {
  const actions = [
    { label: 'See all FAQs', href: '/frequently-asked-questions' }
  ]
  const heading = () => screen.getByRole('heading', { level: 2 })

  it('starts the heading by default', () => {
    render(<FAQ title='Questions, answered' items={items} actions={actions} />)

    expect(textAlignOf(heading())).toBe('start')
  })

  it('centres the heading and the actions when asked', async () => {
    await page.viewport(DESKTOP.width, DESKTOP.height)
    render(
      <FAQ
        align='center'
        title='Questions, answered'
        items={items}
        actions={actions}
      />
    )

    expect(textAlignOf(heading())).toBe('center')
    const link = screen.getByRole('link', { name: 'See all FAQs' })
    expect(
      Math.abs(centreOf(link) - centreOf(heading().parentElement!))
    ).toBeLessThan(2)
  })

  it('sets the title smaller at md, and again at sm', async () => {
    await page.viewport(DESKTOP.width, DESKTOP.height)
    const { rerender } = render(
      <FAQ title='Questions, answered' items={items} />
    )
    const large = fontSizeOf(heading())

    rerender(<FAQ size='md' title='Questions, answered' items={items} />)
    expect(fontSizeOf(heading())).toBeLessThan(large)
    const medium = fontSizeOf(heading())

    rerender(<FAQ size='sm' title='Questions, answered' items={items} />)
    expect(fontSizeOf(heading())).toBeLessThan(medium)
  })
})

describe('FAQ on a surface', () => {
  it.each([false, true])(
    'lines the questions up with the heading on a surface, contained %s',
    async (contained) => {
      await page.viewport(DESKTOP.width, DESKTOP.height)
      render(
        <FAQ
          emphasis='subtle'
          contained={contained}
          title='Questions, answered'
          items={items}
        />
      )

      const heading = screen.getByRole('heading', { level: 2 })
      const question = screen.getByRole('heading', {
        name: 'Does it cost anything?'
      })
      expect(question.getBoundingClientRect().left).toBeCloseTo(
        heading.getBoundingClientRect().left,
        0
      )
    }
  )
})

describe('FAQ intent and emphasis', () => {
  const surfaces = [
    [undefined, 'subtler'],
    [undefined, 'subtle'],
    [undefined, 'normal'],
    ['subtle', 'subtler'],
    ['subtler', 'subtle'],
    ['raised', 'subtle'],
    ['subtle', 'normal'],
    ['raised', 'normal'],
    ['normal', 'subtler']
  ] as const satisfies readonly (readonly [
    BlockEmphasis | undefined,
    FAQItemEmphasis
  ])[]
  const cases = MODES.flatMap((theme) =>
    surfaces.flatMap(([emphasis, itemEmphasis]) =>
      INTENTS.map(
        (intent) =>
          [emphasis ?? 'no', itemEmphasis, intent, theme, emphasis] as const
      )
    )
  )

  it.each(cases)(
    'keeps its text readable on a %s surface with %s %s questions in %s mode',
    async (_, itemEmphasis, intent, theme, emphasis) => {
      setMode(theme)
      onTestFinished(() => setMode('light'))
      const { container } = render(
        <FAQ
          intent={intent}
          emphasis={emphasis}
          itemEmphasis={itemEmphasis}
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
