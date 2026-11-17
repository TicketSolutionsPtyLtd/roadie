// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PropsDefinitions, PropsList } from './PropsDefinitions'

describe('PropsList', () => {
  it('puts every term and definition inside a description list', () => {
    const { container } = render(
      <PropsList
        title='Chart'
        props={[
          {
            name: 'label',
            required: true,
            type: 'string',
            description: 'Fixed name for the card.'
          }
        ]}
      />
    )
    const terms = container.querySelectorAll('dt, dd')
    expect(terms).toHaveLength(2)
    for (const term of terms) expect(term.closest('dl')).not.toBeNull()
  })

  it('shows a long union’s first members, and the rest on request', () => {
    const names = Array.from({ length: 30 }, (_, index) => `"Name${index}"`)
    render(
      <PropsList props={[{ name: 'illustration', type: names.join(' | ') }]} />
    )

    const rest = screen.getByText('Show all 30').closest('details')!
    expect(rest.open).toBe(false)
    expect(
      screen.getByText(names.slice(0, 8).join(' | ') + ' | …')
    ).not.toBeNull()
    expect(rest.textContent).toContain(names.join(' | '))
  })

  it('shows a short union whole', () => {
    const type = Array.from({ length: 13 }, (_, index) => `"N${index}"`).join(
      ' | '
    )
    const { container } = render(
      <PropsList props={[{ name: 'intent', type }]} />
    )

    expect(within(container).getByText(type)).not.toBeNull()
    expect(container.querySelector('details')).toBeNull()
  })

  it('shows an object type whole, however many unions its fields hold', () => {
    const field = (index: number) =>
      `kind${index}: "number" | "text" | "status"`
    const type = `readonly { ${Array.from({ length: 12 }, (_, index) => field(index)).join('; ')} }[]`
    const { container } = render(
      <PropsList props={[{ name: 'columns', type }]} />
    )

    expect(within(container).getByText(type)).not.toBeNull()
    expect(container.querySelector('details')).toBeNull()
  })
})

describe('PropsDefinitions', () => {
  it('lists each named component, then its parts', () => {
    render(<PropsDefinitions component={['Checkbox', 'CheckboxGroup']} />)
    expect(
      screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    ).toEqual([
      'Checkbox',
      'CheckboxGroup',
      'CheckboxGroup.ErrorText',
      'CheckboxGroup.HelperText',
      'CheckboxGroup.Item',
      'CheckboxGroup.Label'
    ])
  })

  it('shows numeric and null literals unquoted', () => {
    render(<PropsDefinitions component='Pane' />)
    expect(screen.getByText(/^0 \| 1 \| /)).not.toBeNull()
  })

  it('fails for a name no manifest lists', () => {
    expect(() => render(<PropsDefinitions component='Nope' />)).toThrow(
      'No component named Nope'
    )
  })
})
