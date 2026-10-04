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
              id: 'venue:iguana',
              label: 'Venue is Iguana Teapot Hall',
              kind: 'filter',
              value: 'iguana'
            }
          ]
        }
      ]
    : []

const scope: QueryFieldChip = {
  id: 'event',
  label: 'Event is Lampshade Disco',
  locked: true
}
const chips: QueryFieldChip[] = [
  scope,
  { id: 'status', label: 'Status is On sale' },
  { id: 'city', label: 'City is Perth' },
  { id: 'tier', label: 'Ticket type is General admission' },
  { id: 'venue', label: 'Venue is Iguana Teapot Hall' }
]

const LONG_LABEL = 'Venue is The Midnight Paddock Collective Long Name Hall'

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

  it.each([
    ['chip', {}],
    ['pending chip', { pendingChip: { id: 'venue', label: LONG_LABEL } }]
  ] as const)('keeps the input on a long %s’s row', (_, props) => {
    const initialChips =
      'pendingChip' in props ? [] : [{ id: 'venue', label: LONG_LABEL }]
    render(<Harness initialChips={initialChips} {...props} />)
    expect(box(group()).height).toBe(40)
    expect(box(input()).width).toBeGreaterThanOrEqual(32)
  })

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
    await userEvent.keyboard('igua')
    const search = await screen.findByRole('option', { name: /Search for/ })
    expect(shown(search.querySelector('kbd'))).toBe(true)
    await userEvent.keyboard('{ArrowDown}')
    const filter = screen.getByRole('option', { name: /Iguana Teapot Hall/ })
    await expect.poll(() => shown(filter.querySelector('kbd'))).toBe(true)
    expect(search.querySelector('kbd')).toBeNull()
  })

  it('searches on Enter while the pointer rests on a filter', async () => {
    const accepted: string[] = []
    render(
      <Harness onAccept={(suggestion) => accepted.push(suggestion.kind)} />
    )
    await userEvent.click(input())
    await userEvent.keyboard('igua')
    const filter = await screen.findByRole('option', {
      name: /Iguana Teapot Hall/
    })
    await userEvent.hover(filter)
    expect(filter.querySelector('kbd')).toBeNull()
    await userEvent.keyboard('{Enter}')
    expect(accepted).toEqual(['search'])
  })

  it('takes no value under the pointer after clicking a field', async () => {
    const accepted: string[] = []
    function ValueStep() {
      const [pending, setPending] = useState(false)
      return (
        <Harness
          pendingChip={pending ? { id: 'venue', label: 'Venue is' } : undefined}
          suggest={() =>
            pending
              ? suggest('values')
              : [
                  {
                    id: 'fields',
                    label: 'Filter by',
                    items: [
                      {
                        id: 'venue',
                        label: 'Venue',
                        kind: 'field',
                        value: 'venue'
                      }
                    ]
                  }
                ]
          }
          onAccept={(suggestion) => {
            accepted.push(suggestion.kind)
            if (suggestion.kind === 'field') setPending(true)
          }}
        />
      )
    }
    render(<ValueStep />)
    await userEvent.click(input())
    await userEvent.click(await screen.findByRole('option', { name: 'Venue' }))
    await screen.findByRole('option', { name: /Iguana Teapot Hall/ })
    await userEvent.keyboard('{Enter}')
    expect(accepted).toEqual(['field'])
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

  it("shows a chip's description on hover", async () => {
    render(
      <Harness
        initialChips={[
          {
            id: 'starts',
            label: 'Starts: This weekend',
            description: '3 to 4 Oct'
          }
        ]}
      />
    )
    await userEvent.hover(
      document.querySelector('[data-slot=combobox-chip][data-chip-id=starts]')!
    )
    expect(await screen.findByText('3 to 4 Oct')).toBeVisible()
  })

  it('keeps the icon and Clear on the first row as chips wrap', () => {
    render(<Harness initialChips={chips} />)
    const first = document.querySelector('[data-slot=combobox-chip]')!
    const middle = (element: Element) =>
      box(element).top + box(element).height / 2
    expect(box(group()).height).toBeGreaterThan(40)
    const icon = group().querySelector('svg')!
    const clear = screen.getByRole('button', { name: 'Clear' })
    expect(Math.abs(middle(icon) - middle(first))).toBeLessThanOrEqual(1)
    expect(Math.abs(middle(clear) - middle(first))).toBeLessThanOrEqual(1)
  })
})
