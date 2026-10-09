// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
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
