import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Combobox, comboboxInputGroupVariants } from '.'

describe('Combobox', () => {
  it('renders root component', () => {
    const { container } = render(
      <Combobox>
        <Combobox.InputGroup>
          <Combobox.Input placeholder='Search...' />
          <Combobox.Trigger />
        </Combobox.InputGroup>
      </Combobox>
    )
    expect(container).toBeInTheDocument()
  })

  it('renders InputGroup with default variant classes', () => {
    const classes = comboboxInputGroupVariants()
    expect(classes).toContain('emphasis-sunken')
    expect(classes).toContain('is-interactive-field-group')
    expect(classes).not.toContain('intent-neutral')
  })

  it('renders InputGroup with different intents', () => {
    expect(comboboxInputGroupVariants({ intent: 'accent' })).toContain(
      'intent-accent'
    )
    expect(comboboxInputGroupVariants({ intent: 'danger' })).toContain(
      'intent-danger'
    )
  })

  it('renders InputGroup with different emphasis', () => {
    expect(comboboxInputGroupVariants({ emphasis: 'normal' })).toContain(
      'emphasis-sunken'
    )
    expect(comboboxInputGroupVariants({ emphasis: 'subtle' })).toContain(
      'bg-subtle'
    )
  })

  it('renders InputGroup with different sizes', () => {
    expect(comboboxInputGroupVariants({ size: 'sm' })).toContain('h-8')
    expect(comboboxInputGroupVariants({ size: 'md' })).toContain('h-10')
    expect(comboboxInputGroupVariants({ size: 'lg' })).toContain('h-12')
  })

  it('renders Label sub-component', () => {
    const { getByText } = render(
      <Combobox>
        <Combobox.Label>Search items</Combobox.Label>
        <Combobox.InputGroup>
          <Combobox.Input />
        </Combobox.InputGroup>
      </Combobox>
    )
    expect(getByText('Search items')).toBeInTheDocument()
  })

  it('renders with custom className on InputGroup', () => {
    const classes = comboboxInputGroupVariants({ className: 'custom-class' })
    expect(classes).toContain('custom-class')
  })
})
