import { useState } from 'react'

import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import { QueryField, type QueryFieldProps } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { keepFramesRunning } from '../../css/testUtils'
import { useStylesheet } from '../Pane/testUtils'
import { Tooltip } from '../Tooltip'
import type {
  QueryFieldChip,
  QueryFieldOperator,
  QueryFieldSuggestionGroup
} from './types'

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

const LONG_LABEL = 'Venue is Gooseberry Signal Warehouse, Fortitude Valley'

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
      label: LONG_LABEL
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

  it('pads the end of a chip with no remove button', () => {
    render(
      <Harness
        initialChips={[scope, { id: 'city', label: 'City is Perth' }]}
        onRemoveChip={undefined}
      />
    )
    const chips = document.querySelectorAll('[data-slot=combobox-chip]')
    expect(chips).toHaveLength(2)
    for (const each of chips) {
      const style = getComputedStyle(each)
      expect(parseFloat(style.paddingInlineEnd)).toBeGreaterThanOrEqual(
        parseFloat(style.paddingInlineStart)
      )
    }
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

  it('sizes operators as Buttons, at least square, above values that keep their label for assistive technology', async () => {
    // As narrow as labels get.
    const symbols: QueryFieldOperator[] = [
      { value: 'not', label: '!', 'aria-label': 'not' },
      { value: 'or', label: '|', 'aria-label': 'or' }
    ]
    render(
      <Harness
        pendingChip={{
          id: 'tickets',
          label: 'Tickets !',
          operators: symbols,
          operator: 'not'
        }}
        suggest={() => suggest('values')}
      />
    )
    await userEvent.click(input())
    await screen.findByRole('button', { name: 'not' })
    for (const name of ['not', 'or']) {
      const item = screen.getByRole('button', { name })
      expect(box(item).height).toBeGreaterThanOrEqual(32)
      expect(box(item).width).toBeGreaterThanOrEqual(box(item).height)
    }
    const label = document.querySelector('[data-slot=combobox-group-label]')!
    expect(box(label).width).toBeLessThanOrEqual(1)
    expect(screen.getByRole('group', { name: 'Filters' })).toBeInTheDocument()
  })

  it('fills the row Enter takes until another row is highlighted', async () => {
    const cities: QueryFieldSuggestionGroup[] = [
      {
        id: 'values',
        label: 'City',
        items: ['Brisbane', 'Hobart'].map((city) => ({
          id: city,
          label: city,
          kind: 'filter' as const,
          value: city
        }))
      }
    ]
    render(
      <Harness
        pendingChip={{ id: 'city', label: 'City is' }}
        suggest={() => cities}
      />
    )
    await userEvent.type(input(), 'b')
    const fill = (name: string) =>
      getComputedStyle(screen.getByRole('option', { name: new RegExp(name) }))
        .backgroundColor
    await expect.poll(() => fill('Brisbane')).not.toBe(fill('Hobart'))
    const resting = fill('Hobart')
    const hobart = screen.getByRole('option', { name: /Hobart/ })
    await userEvent.hover(hobart)
    // Headless WebKit on Linux runs no frames while idle, so the fill's
    // transition would never finish.
    keepFramesRunning(() => {
      const { x, y, width, height } = hobart.getBoundingClientRect()
      return { x: x + width / 2, y: y + height / 2 }
    })
    await expect.poll(() => fill('Brisbane')).toBe(resting)
  })

  it('sizes each operator to its own label', async () => {
    const words: QueryFieldOperator[] = [
      { value: 'contains', label: 'contains' },
      { value: 'not-contains', label: 'doesn’t contain' },
      { value: 'is', label: 'is' }
    ]
    render(
      <Harness
        pendingChip={{
          id: 'show',
          label: 'Show contains',
          operators: words,
          operator: 'contains'
        }}
        suggest={() => suggest('values')}
      />
    )
    await userEvent.click(input())
    const short = await screen.findByRole('button', { name: 'is' })
    const long = screen.getByRole('button', { name: 'doesn’t contain' })
    expect(box(short).width).toBeLessThan(box(long).width / 2)
  })

  it('scrolls operators sideways when they outgrow the popup, keeping them above the values', async () => {
    const many: QueryFieldOperator[] = Array.from(
      { length: 24 },
      (_, index) => ({ value: `op-${index}`, label: `is something ${index}` })
    )
    render(
      <Harness
        pendingChip={{
          id: 'venue',
          label: 'Venue is',
          operators: many,
          operator: 'op-23'
        }}
        suggest={() => suggest('values')}
      />
    )
    await userEvent.click(input())
    await screen.findByRole('option', { name: /Iguana Teapot Hall/ })
    const toggle = screen.getByRole('group', { name: 'Operator' })
    const popup = document.querySelector('[data-slot=combobox-popup]')!
    expect(toggle.scrollWidth).toBeGreaterThan(toggle.clientWidth)
    expect(box(toggle).right).toBeLessThanOrEqual(box(popup).right)
    await expect.poll(() => toggle.scrollLeft).toBeGreaterThan(0)
  })

  it('keeps focus in the input and the values open when an operator is pressed', async () => {
    function Step() {
      const [operator, setOperator] = useState('is')
      return (
        <Harness
          pendingChip={{
            id: 'venue',
            label: operator === 'is' ? 'Venue is' : 'Venue is not',
            operators: [
              { value: 'is', label: 'is' },
              { value: 'is-not', label: 'is not' }
            ],
            operator
          }}
          onPendingOperatorChange={setOperator}
          suggest={() => suggest('values')}
        />
      )
    }
    render(<Step />)
    await userEvent.click(input())
    await userEvent.click(await screen.findByRole('button', { name: 'is not' }))
    expect(document.activeElement).toBe(input())
    expect(screen.getByRole('button', { name: 'is not' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(
      screen.getByRole('option', { name: /Iguana Teapot Hall/ })
    ).toBeVisible()
  })

  it('keeps operators in view, at the top, as the values scroll', async () => {
    const values = Array.from({ length: 40 }, (_, index) => ({
      id: `value-${index}`,
      label: `Venue ${index}`,
      kind: 'filter' as const,
      value: index
    }))
    render(
      <Harness
        pendingChip={{
          id: 'venue',
          label: 'Venue is',
          operators: [
            { value: 'is', label: 'is' },
            { value: 'is-not', label: 'is not' }
          ],
          operator: 'is'
        }}
        suggest={() => [{ id: 'values', label: 'Venue', items: values }]}
      />
    )
    await userEvent.click(input())
    await screen.findByRole('option', { name: 'Venue 0' })
    const popup = document.querySelector('[data-slot=combobox-popup]')!
    const toggle = screen.getByRole('group', { name: 'Operator' })
    const resting = box(toggle).top - box(popup).top
    popup.scrollTop = popup.scrollHeight
    await expect.poll(() => popup.scrollTop).toBeGreaterThan(0)
    expect(box(toggle).top - box(popup).top).toBe(resting)
  })

  it('shows a hidden label to no one but assistive technology, with a line between the value step’s groups', async () => {
    render(
      <Harness
        pendingChip={{ id: 'venue', label: 'Venue is' }}
        suggest={() => [
          {
            id: 'empty',
            label: 'Empty',
            hideLabel: true,
            items: [
              { id: 'empty', label: 'Empty', kind: 'filter', value: 'empty' }
            ]
          },
          suggest('values')[0]!
        ]}
      />
    )
    await userEvent.click(input())
    await screen.findByRole('option', { name: /Iguana Teapot Hall/ })
    const empty = screen.getByRole('group', { name: 'Empty' })
    const values = screen.getByRole('group', { name: 'Filters' })
    const [hidden, shownLabel] = [empty, values].map((each) =>
      each.querySelector('[data-slot=combobox-group-label]')!
    )
    expect(box(hidden!).width).toBeLessThanOrEqual(1)
    expect(box(shownLabel!).width).toBeGreaterThan(1)
    const divider = document.querySelector('[data-slot=query-field-divider]')!
    const line = getComputedStyle(divider, '::before')
    expect(parseFloat(line.borderTopWidth)).toBeGreaterThan(0)
    expect(line.borderTopStyle).toBe('solid')
    expect(box(divider).top).toBeGreaterThanOrEqual(box(empty).bottom)
    expect(box(divider).bottom).toBeLessThanOrEqual(box(values).top)
    expect(box(divider).width).toBeGreaterThan(box(divider).height)
  })
})
