import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Autocomplete, autocompleteInputGroupVariants } from '.'

describe('Autocomplete', () => {
  it('renders root component', () => {
    const { container } = render(
      <Autocomplete>
        <Autocomplete.InputGroup>
          <Autocomplete.Input placeholder='Search...' />
        </Autocomplete.InputGroup>
      </Autocomplete>
    )
    expect(container).toBeInTheDocument()
  })

  it('renders InputGroup with default variant classes', () => {
    const classes = autocompleteInputGroupVariants()
    expect(classes).toContain('emphasis-sunken')
    expect(classes).toContain('is-interactive-field-group')
    expect(classes).not.toContain('intent-neutral')
  })

  it('renders InputGroup with different intents', () => {
    expect(autocompleteInputGroupVariants({ intent: 'accent' })).toContain(
      'intent-accent'
    )
    expect(autocompleteInputGroupVariants({ intent: 'danger' })).toContain(
      'intent-danger'
    )
  })

  it('renders InputGroup with different emphasis', () => {
    expect(autocompleteInputGroupVariants({ emphasis: 'normal' })).toContain(
      'emphasis-sunken'
    )
    expect(autocompleteInputGroupVariants({ emphasis: 'subtle' })).toContain(
      'bg-subtle'
    )
  })

  it('renders InputGroup with different sizes', () => {
    expect(autocompleteInputGroupVariants({ size: 'sm' })).toContain('h-8')
    expect(autocompleteInputGroupVariants({ size: 'md' })).toContain('h-10')
    expect(autocompleteInputGroupVariants({ size: 'lg' })).toContain('h-12')
  })

  it('renders with custom className on InputGroup', () => {
    const classes = autocompleteInputGroupVariants({
      className: 'custom-class'
    })
    expect(classes).toContain('custom-class')
  })
})
