import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Fieldset } from '.'

describe('Fieldset', () => {
  it('renders with default props', () => {
    const { container } = render(<Fieldset>Content</Fieldset>)
    const fieldset = container.querySelector('fieldset')!
    expect(fieldset).toBeInTheDocument()
    expect(fieldset).toHaveClass('border-none', 'p-0', 'm-0')
  })

  it('renders Legend sub-component', () => {
    const { getByText } = render(
      <Fieldset>
        <Fieldset.Legend>Personal details</Fieldset.Legend>
      </Fieldset>
    )
    const legend = getByText('Personal details')
    expect(legend).toBeInTheDocument()
    expect(legend.tagName.toLowerCase()).toBe('legend')
    expect(legend).toHaveClass('text-lg', 'font-semibold', 'text-strong')
  })

  it('renders HelperText sub-component', () => {
    const { getByText } = render(
      <Fieldset>
        <Fieldset.HelperText>Fill in all fields</Fieldset.HelperText>
      </Fieldset>
    )
    const helperText = getByText('Fill in all fields')
    expect(helperText).toBeInTheDocument()
    expect(helperText.tagName.toLowerCase()).toBe('p')
    expect(helperText).toHaveClass('text-sm', 'text-subtle')
  })

  it('renders ErrorText sub-component', () => {
    const { getByText } = render(
      <Fieldset>
        <Fieldset.ErrorText>Please fix errors</Fieldset.ErrorText>
      </Fieldset>
    )
    const errorText = getByText('Please fix errors')
    expect(errorText).toBeInTheDocument()
    expect(errorText.tagName.toLowerCase()).toBe('p')
    expect(errorText).toHaveClass('text-sm', 'intent-danger')
  })

  it('renders a complete fieldset with all sub-components', () => {
    const { getByText } = render(
      <Fieldset>
        <Fieldset.Legend>Account</Fieldset.Legend>
        <Fieldset.HelperText>Enter your details</Fieldset.HelperText>
        <Fieldset.ErrorText>Something went wrong</Fieldset.ErrorText>
      </Fieldset>
    )
    expect(getByText('Account')).toBeInTheDocument()
    expect(getByText('Enter your details')).toBeInTheDocument()
    expect(getByText('Something went wrong')).toBeInTheDocument()
  })

  it('applies custom className to root', () => {
    const { container } = render(
      <Fieldset className='custom-class'>Content</Fieldset>
    )
    expect(container.querySelector('fieldset')).toHaveClass('custom-class')
  })

  it('forwards HTML attributes', () => {
    const { container } = render(
      <Fieldset disabled data-testid='my-fieldset'>
        Content
      </Fieldset>
    )
    const fieldset = container.querySelector('fieldset')!
    expect(fieldset).toBeDisabled()
    expect(fieldset).toHaveAttribute('data-testid', 'my-fieldset')
  })
})
