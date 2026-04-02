import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Field } from '.'

describe('Field', () => {
  it('renders with default props', () => {
    const { container } = render(<Field>Content</Field>)
    const root = container.firstElementChild!
    expect(root).toBeInTheDocument()
    expect(root.tagName.toLowerCase()).toBe('div')
    expect(root).toHaveClass('grid', 'gap-1.5')
  })

  it('renders Label sub-component', () => {
    const { getByText } = render(
      <Field>
        <Field.Label>Email</Field.Label>
      </Field>
    )
    const label = getByText('Email')
    expect(label).toBeInTheDocument()
    expect(label.tagName.toLowerCase()).toBe('label')
    expect(label).toHaveClass('text-sm', 'font-medium')
  })

  it('renders Input sub-component', () => {
    const { container } = render(
      <Field>
        <Field.Input placeholder='Enter email' />
      </Field>
    )
    const input = container.querySelector('input')!
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('placeholder', 'Enter email')
  })

  it('renders Textarea sub-component', () => {
    const { container } = render(
      <Field>
        <Field.Textarea placeholder='Enter description' />
      </Field>
    )
    const textarea = container.querySelector('textarea')!
    expect(textarea).toBeInTheDocument()
    expect(textarea).toHaveAttribute('placeholder', 'Enter description')
  })

  it('renders HelperText sub-component', () => {
    const { getByText } = render(
      <Field>
        <Field.HelperText>We will never share your email</Field.HelperText>
      </Field>
    )
    const helperText = getByText('We will never share your email')
    expect(helperText).toBeInTheDocument()
    expect(helperText.tagName.toLowerCase()).toBe('p')
    expect(helperText).toHaveClass('text-sm', 'text-subtle')
  })

  it('renders ErrorText sub-component', () => {
    const { getByText } = render(
      <Field>
        <Field.ErrorText>Email is required</Field.ErrorText>
      </Field>
    )
    const errorText = getByText('Email is required')
    expect(errorText).toBeInTheDocument()
    expect(errorText.tagName.toLowerCase()).toBe('p')
    expect(errorText).toHaveClass('text-sm', 'intent-danger')
  })

  it('renders a complete field with all sub-components', () => {
    const { getByText, container } = render(
      <Field>
        <Field.Label htmlFor='email'>Email</Field.Label>
        <Field.Input id='email' />
        <Field.HelperText>Enter your email</Field.HelperText>
      </Field>
    )
    expect(getByText('Email')).toBeInTheDocument()
    expect(container.querySelector('input')).toBeInTheDocument()
    expect(getByText('Enter your email')).toBeInTheDocument()
  })

  it('applies custom className to root', () => {
    const { container } = render(
      <Field className='custom-class'>Content</Field>
    )
    expect(container.firstElementChild).toHaveClass('custom-class')
  })
})
