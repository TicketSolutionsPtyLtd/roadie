import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Fieldset } from '.'

describe('Fieldset', () => {
  it('renders with default props using Fieldset.Root', () => {
    const { container } = render(<Fieldset.Root>Content</Fieldset.Root>)
    const fieldset = container.querySelector('fieldset')!
    expect(fieldset).toBeInTheDocument()
    expect(fieldset).toHaveClass('border-none', 'p-0', 'm-0')
  })

  it('renders with default props using bare <Fieldset> root alias', () => {
    const { container } = render(<Fieldset>Content</Fieldset>)
    const fieldset = container.querySelector('fieldset')!
    expect(fieldset).toBeInTheDocument()
    expect(fieldset).toHaveClass('border-none', 'p-0', 'm-0')
  })

  it('Fieldset and Fieldset.Root are the same component reference', () => {
    expect(Fieldset).toBe(Fieldset.Root)
  })

  it('renders bare <Fieldset> with sub-components', () => {
    const { getByText } = render(
      <Fieldset invalid>
        <Fieldset.Legend>Bare root</Fieldset.Legend>
        <Fieldset.HelperText>Helper text</Fieldset.HelperText>
        <Fieldset.ErrorText>Error text</Fieldset.ErrorText>
      </Fieldset>
    )
    expect(getByText('Bare root')).toBeInTheDocument()
    expect(getByText('Helper text')).toBeInTheDocument()
    expect(getByText('Error text')).toBeInTheDocument()
  })

  it('renders Legend sub-component', () => {
    const { getByText } = render(
      <Fieldset.Root>
        <Fieldset.Legend>Personal details</Fieldset.Legend>
      </Fieldset.Root>
    )
    const legend = getByText('Personal details')
    expect(legend).toBeInTheDocument()
    expect(legend.tagName.toLowerCase()).toBe('legend')
    expect(legend).toHaveClass('text-lg', 'font-semibold', 'text-strong')
  })

  it('renders HelperText sub-component', () => {
    const { getByText } = render(
      <Fieldset.Root>
        <Fieldset.HelperText>Fill in all fields</Fieldset.HelperText>
      </Fieldset.Root>
    )
    const helperText = getByText('Fill in all fields')
    expect(helperText).toBeInTheDocument()
    expect(helperText.tagName.toLowerCase()).toBe('p')
    expect(helperText).toHaveClass('text-sm', 'text-subtle')
  })

  it('hides ErrorText when invalid is not set', () => {
    const { queryByText } = render(
      <Fieldset.Root>
        <Fieldset.ErrorText>Please fix errors</Fieldset.ErrorText>
      </Fieldset.Root>
    )
    expect(queryByText('Please fix errors')).not.toBeInTheDocument()
  })

  it('renders ErrorText when invalid is true', () => {
    const { getByText } = render(
      <Fieldset.Root invalid>
        <Fieldset.ErrorText>Please fix errors</Fieldset.ErrorText>
      </Fieldset.Root>
    )
    const errorText = getByText('Please fix errors')
    expect(errorText).toBeInTheDocument()
    expect(errorText.tagName.toLowerCase()).toBe('p')
    expect(errorText).toHaveClass('text-sm', 'intent-danger')
  })

  it('renders a complete fieldset with all sub-components', () => {
    const { getByText } = render(
      <Fieldset.Root invalid>
        <Fieldset.Legend>Account</Fieldset.Legend>
        <Fieldset.HelperText>Enter your details</Fieldset.HelperText>
        <Fieldset.ErrorText>Something went wrong</Fieldset.ErrorText>
      </Fieldset.Root>
    )
    expect(getByText('Account')).toBeInTheDocument()
    expect(getByText('Enter your details')).toBeInTheDocument()
    expect(getByText('Something went wrong')).toBeInTheDocument()
  })

  it('applies custom className to root', () => {
    const { container } = render(
      <Fieldset.Root className='custom-class'>Content</Fieldset.Root>
    )
    expect(container.querySelector('fieldset')).toHaveClass('custom-class')
  })

  it('forwards HTML attributes', () => {
    const { container } = render(
      <Fieldset.Root disabled data-testid='my-fieldset'>
        Content
      </Fieldset.Root>
    )
    const fieldset = container.querySelector('fieldset')!
    expect(fieldset).toBeDisabled()
    expect(fieldset).toHaveAttribute('data-testid', 'my-fieldset')
  })
})
