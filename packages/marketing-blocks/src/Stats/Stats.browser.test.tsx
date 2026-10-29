import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Stats, type StatsProps } from '.'
import {
  DESKTOP,
  PHONE,
  atWidth,
  axeViolations,
  withBrowserPage
} from '../_test/browser'

withBrowserPage()

const facts: StatsProps = {
  title: 'By the numbers',
  description: 'The impact of genuine partnerships',
  items: [
    { value: '33,000,000+', label: 'tickets sold', illustration: 'Ticket' },
    { value: '22,000+', label: 'event organisers', illustration: 'MapPin' },
    { value: '20+', label: 'years in ticketing', illustration: 'Heart' },
    { value: '50+', label: 'full-time team', illustration: 'HighFive' }
  ]
}

async function statsPerRowAt({
  width,
  height
}: {
  width: number
  height: number
}) {
  await atWidth(width, height)
  render(<Stats {...facts} />)
  const tops = screen
    .getAllByRole('listitem')
    .map((item) => Math.round(item.getBoundingClientRect().top))
  return tops.filter((top) => top === tops[0]).length
}

describe('Stats layout', () => {
  it('stacks the stats one to a row on phones', async () => {
    expect(await statsPerRowAt(PHONE)).toBe(1)
  })

  it('sets the stats three to a row on wide screens', async () => {
    expect(await statsPerRowAt(DESKTOP)).toBe(3)
  })

  it('sets each illustration beside its value', () => {
    const { container } = render(<Stats {...facts} />)

    const illustration = container
      .querySelector('li svg')!
      .getBoundingClientRect()
    const value = screen.getByText('33,000,000+').getBoundingClientRect()
    expect(illustration.right).toBeLessThanOrEqual(value.left)
    expect(illustration.top).toBeLessThan(value.bottom)
  })
})

describe('Stats accessibility', () => {
  it('has no axe violations as company-facts', async () => {
    const { container } = render(<Stats {...facts} />)

    expect(await axeViolations(container)).toEqual([])
  })
})
