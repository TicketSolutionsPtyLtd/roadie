import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Autocomplete, autocompleteInputGroupVariants } from '.'
import { Field } from '../Field'

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

  it('Autocomplete input gets aria attributes from Field context', () => {
    const { container } = render(
      <Field invalid required>
        <Field.Label>Address</Field.Label>
        <Autocomplete>
          <Autocomplete.InputGroup>
            <Autocomplete.Input placeholder='Start typing...' />
          </Autocomplete.InputGroup>
        </Autocomplete>
        <Field.ErrorText>Required</Field.ErrorText>
      </Field>
    )
    const input = container.querySelector('input')!
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-required', 'true')
  })

  it('standalone Autocomplete works without Field', () => {
    const { container } = render(
      <Autocomplete>
        <Autocomplete.InputGroup>
          <Autocomplete.Input placeholder='Search...' />
        </Autocomplete.InputGroup>
      </Autocomplete>
    )
    const input = container.querySelector('input')!
    expect(input).not.toHaveAttribute('aria-invalid')
    expect(input).not.toHaveAttribute('aria-required')
  })
})
