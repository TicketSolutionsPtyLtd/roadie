import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { type AlternatingRow, AlternatingRows } from '.'
import { BlocksProvider } from '../Provider'

const values: AlternatingRow[] = [
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

describe('AlternatingRows', () => {
  it('renders its rows as h3s under the block’s h2, each with its image', () => {
    render(<AlternatingRows title='Our values' rows={values} />)

    const section = screen.getByRole('region', { name: 'Our values' })
    expect(section).toHaveAttribute('data-preset', 'text-blocks')
    expect(within(section).getAllByRole('listitem')).toHaveLength(2)
    expect(
      screen.getByRole('heading', { level: 3, name: 'Proactive touch' })
    ).toBeInTheDocument()
    expect(screen.getByText('Lift spirits')).toBeInTheDocument()
    expect(screen.getByText('We love what we do.')).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'Three partners smiling' })
    ).toHaveAttribute('src', '/two.jpg')
  })

  it('links a row by its title and reports the title alone as the click label', async () => {
    const onBlockEvent = vi.fn()
    render(
      <BlocksProvider onBlockEvent={onBlockEvent}>
        <AlternatingRows
          title='Our values'
          rows={[{ ...values[0]!, href: '/values/proactive' }, values[1]!]}
        />
      </BlocksProvider>
    )

    const link = screen.getByRole('link', { name: 'Proactive touch' })
    expect(
      screen.getByRole('heading', { level: 3, name: 'Proactive touch' })
    ).toContainElement(link)
    await userEvent.click(link)
    expect(onBlockEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Proactive touch',
        href: '/values/proactive'
      })
    )
  })

  const markOf = (name: string) =>
    screen.getByText(name).closest('[data-slot="mark"]')

  it('cycles its title marks, or takes the block’s or a row’s intent', () => {
    const three = [
      values[0]!,
      values[1]!,
      { ...values[1]!, title: 'Third', intent: 'success' as const }
    ]
    const { unmount } = render(<AlternatingRows title='Values' rows={three} />)
    expect(markOf('Proactive touch')).toHaveClass('intent-info')
    expect(markOf('Positive energy')).toHaveClass('intent-brand')
    expect(markOf('Third')).toHaveClass('intent-success')
    unmount()

    render(<AlternatingRows intent='danger' title='Values' rows={three} />)
    expect(markOf('Proactive touch')).toHaveClass('intent-danger')
    expect(markOf('Positive energy')).toHaveClass('intent-danger')
    expect(markOf('Third')).toHaveClass('intent-success')
  })

  it('draws every row on its item emphasis, and a linked bare row on subtler', () => {
    const { unmount } = render(
      <AlternatingRows itemEmphasis='subtle' title='Values' rows={values} />
    )
    for (const row of screen.getAllByRole('listitem'))
      expect(row).toHaveClass('emphasis-subtle')
    unmount()

    render(
      <AlternatingRows
        title='Values'
        rows={[{ ...values[0]!, href: '/values' }, values[1]!]}
      />
    )
    const [linked, plain] = screen.getAllByRole('listitem')
    expect(linked).toHaveClass('emphasis-subtler')
    expect(plain!.className).not.toMatch(/emphasis-/)
  })

  it.each([
    [undefined, 'band'],
    [true, 'panel']
  ] as const)('draws contained %s as a %s', (contained, shape) => {
    render(
      <AlternatingRows
        emphasis='raised'
        contained={contained}
        title='Section'
        rows={values}
      />
    )

    expect(
      screen.getByRole('region').querySelector('[data-slot="block-surface"]')
    ).toHaveAttribute('data-shape', shape)
  })

  it('draws no surface unless an emphasis is set', () => {
    render(<AlternatingRows title='Section' rows={values} />)

    expect(
      screen.getByRole('region').querySelector('[data-slot="block-surface"]')
    ).toBeNull()
  })
})
