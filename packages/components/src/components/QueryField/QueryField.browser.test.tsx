import { useState } from 'react'

import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import { QueryField, type QueryFieldProps } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'
import { Tooltip } from '../Tooltip'
import type { QueryFieldChip, QueryFieldSuggestionGroup } from './types'

const STILL = '*, *::before, *::after { transition: none !important }'

let removeStylesheets = () => {}
beforeAll(() => {
  const removeRoadie = useStylesheet(roadieCss)
  const removeStill = useStylesheet(STILL)
  removeStylesheets = () => {
    removeRoadie()
    removeStill()
  }
})
afterAll(() => removeStylesheets())
afterEach(() => cleanup())

const suggest = (text: string): QueryFieldSuggestionGroup[] =>
  text
    ? [
        {
          id: 'filters',
          label: 'Filters',
          items: [
            {
              id: 'venue:longacre',
              label: 'Venue is The Longacre',
              kind: 'filter',
              value: 'longacre'
            }
          ]
        }
      ]
    : []

const scope: QueryFieldChip = {
  id: 'event',
  label: 'Event is Neon Nights',
  locked: true
}
const chips: QueryFieldChip[] = [
  scope,
  { id: 'status', label: 'Status is On sale' },
  { id: 'city', label: 'City is Perth' },
  { id: 'tier', label: 'Ticket type is General admission' },
  { id: 'venue', label: 'Venue is The Longacre' }
]

function Harness({
  initialChips = [],
  ...props
}: Partial<QueryFieldProps> & { initialChips?: QueryFieldChip[] }) {
  const [current, setCurrent] = useState(initialChips)
  return (
    <Tooltip.Provider delay={0}>
      <div style={{ width: 360 }}>
        <QueryField
          aria-label='Search orders'
          chips={current}
          onRemoveChip={(id) =>
            setCurrent((list) => list.filter((chip) => chip.id !== id))
          }
          suggest={suggest}
          {...props}
        />
      </div>
    </Tooltip.Provider>
  )
}

const input = () => screen.getByRole('combobox', { name: 'Search orders' })
const group = () => document.querySelector('[data-slot=query-field]')!
const box = (element: Element) => element.getBoundingClientRect()
const shown = (element: Element | null) =>
  !!element && getComputedStyle(element).display !== 'none'

describe('QueryField', () => {
  it.each([
    ['sm', 32],
    ['md', 40],
    ['lg', 48]
  ] as const)(
    'keeps the size-%s height with a line of chips',
    (size, height) => {
      render(<Harness initialChips={[scope]} size={size} />)
      expect(box(group()).height).toBe(height)
    }
  )

  it('wraps chips and grows, truncating a long one inside the field', () => {
    const long: QueryFieldChip = {
      id: 'long',
      label: 'Venue is The Midnight Paddock Collective Long Name Hall'
    }
    render(<Harness initialChips={[...chips, long]} />)
    const field = box(group())
    expect(field.height).toBeGreaterThan(40)
    for (const chip of document.querySelectorAll('[data-slot=combobox-chip]')) {
      expect(box(chip).right).toBeLessThanOrEqual(field.right)
    }
  })

  it('shows the shortcut hint until the field has focus', async () => {
    render(<Harness shortcut='/' />)
    const hint = document.querySelector('[data-slot=query-field-shortcut]')
    expect(shown(hint)).toBe(true)
    await userEvent.keyboard('/')
    expect(document.activeElement).toBe(input())
    expect(shown(hint)).toBe(false)
  })

  it('shows the Enter hint on the suggestion Enter takes', async () => {
    render(<Harness />)
    await userEvent.click(input())
    await userEvent.keyboard('long')
    const search = await screen.findByRole('option', { name: /Search for/ })
    expect(shown(search.querySelector('kbd'))).toBe(true)
    await userEvent.keyboard('{ArrowDown}')
    const filter = screen.getByRole('option', { name: /The Longacre/ })
    await expect.poll(() => shown(filter.querySelector('kbd'))).toBe(true)
    expect(search.querySelector('kbd')).toBeNull()
  })

  it('searches on Enter while the pointer rests on a filter', async () => {
    const accepted: string[] = []
    render(
      <Harness onAccept={(suggestion) => accepted.push(suggestion.kind)} />
    )
    await userEvent.click(input())
    await userEvent.keyboard('long')
    const filter = await screen.findByRole('option', { name: /The Longacre/ })
    await userEvent.hover(filter)
    await userEvent.keyboard('{Enter}')
    expect(accepted).toEqual(['search'])
  })

  it('rings the chip the first Backspace selects', async () => {
    render(<Harness initialChips={chips.slice(0, 2)} />)
    await userEvent.click(input())
    await userEvent.keyboard('{Escape}{Backspace}')
    const chip = document.activeElement!
    expect(chip).toHaveAttribute('data-chip-id', 'status')
    expect(parseFloat(getComputedStyle(chip).outlineWidth)).toBeGreaterThan(0)
  })

  it('explains a locked chip on hover', async () => {
    render(<Harness initialChips={[scope]} />)
    await userEvent.hover(
      document.querySelector('[data-slot=combobox-chip][data-locked]')!
    )
    expect(await screen.findByText('Set by this page')).toBeVisible()
  })

  it('draws a pending chip with a dashed edge', () => {
    render(<Harness pendingChip={{ id: 'venue', label: 'Venue is' }} />)
    const pending = document.querySelector(
      '[data-slot=query-field-pending-chip]'
    )!
    expect(getComputedStyle(pending).borderStyle).toBe('dashed')
    expect(box(pending).height).toBe(24)
  })
})
