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

  it('renders ErrorText sub-component when invalid', () => {
    const { getByText } = render(
      <Field invalid>
        <Field.ErrorText>Email is required</Field.ErrorText>
      </Field>
    )
    const errorText = getByText('Email is required')
    expect(errorText).toBeInTheDocument()
    expect(errorText.tagName.toLowerCase()).toBe('p')
    expect(errorText).toHaveClass('text-sm', 'intent-danger')
  })

  it('hides ErrorText when not invalid', () => {
    const { container } = render(
      <Field>
        <Field.ErrorText>Email is required</Field.ErrorText>
      </Field>
    )
    expect(container.querySelector('[role="alert"]')).not.toBeInTheDocument()
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

  it('propagates aria-invalid and aria-required to Input', () => {
    const { container } = render(
      <Field invalid required>
        <Field.Input />
      </Field>
    )
    const input = container.querySelector('input')!
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-required', 'true')
  })

  it('propagates aria-invalid and aria-required to Textarea', () => {
    const { container } = render(
      <Field invalid required>
        <Field.Textarea />
      </Field>
    )
    const textarea = container.querySelector('textarea')!
    expect(textarea).toHaveAttribute('aria-invalid', 'true')
    expect(textarea).toHaveAttribute('aria-required', 'true')
  })

  it('does not set aria attributes when not invalid or required', () => {
    const { container } = render(
      <Field>
        <Field.Input />
      </Field>
    )
    const input = container.querySelector('input')!
    expect(input).not.toHaveAttribute('aria-invalid')
    expect(input).not.toHaveAttribute('aria-required')
  })

  it('wires aria-describedby to ErrorText when invalid', () => {
    const { container } = render(
      <Field invalid>
        <Field.Input />
        <Field.HelperText>Help</Field.HelperText>
        <Field.ErrorText>Error</Field.ErrorText>
      </Field>
    )
    const input = container.querySelector('input')!
    const errorText = container.querySelector('[role="alert"]')!
    expect(input).toHaveAttribute('aria-describedby', errorText.id)
  })

  it('wires aria-describedby to HelperText when not invalid', () => {
    const { container } = render(
      <Field>
        <Field.Input />
        <Field.HelperText>Help</Field.HelperText>
      </Field>
    )
    const input = container.querySelector('input')!
    const helperText = container.querySelector('p')!
    expect(input).toHaveAttribute('aria-describedby', helperText.id)
  })

  it('auto-wires htmlFor on Label to Input id', () => {
    const { container } = render(
      <Field>
        <Field.Label>Email</Field.Label>
        <Field.Input />
      </Field>
    )
    const label = container.querySelector('label')!
    const input = container.querySelector('input')!
    expect(label).toHaveAttribute('for', input.id)
  })

  it('propagates disabled to Input via context', () => {
    const { container } = render(
      <Field disabled>
        <Field.Input />
      </Field>
    )
    const input = container.querySelector('input')!
    expect(input).toBeDisabled()
  })

  it('propagates disabled to Textarea via context', () => {
    const { container } = render(
      <Field disabled>
        <Field.Textarea />
      </Field>
    )
    const textarea = container.querySelector('textarea')!
    expect(textarea).toBeDisabled()
  })

  it('does not set disabled when not provided', () => {
    const { container } = render(
      <Field>
        <Field.Input />
      </Field>
    )
    const input = container.querySelector('input')!
    expect(input).not.toBeDisabled()
  })

  it('renders RequiredIndicator when showIndicator and required', () => {
    const { getByText } = render(
      <Field required>
        <Field.Label showIndicator>Email</Field.Label>
      </Field>
    )
    expect(getByText('*')).toBeInTheDocument()
  })

  it('renders OptionalIndicator when showIndicator and not required', () => {
    const { getByText } = render(
      <Field>
        <Field.Label showIndicator>Email</Field.Label>
      </Field>
    )
    expect(getByText('(optional)')).toBeInTheDocument()
  })

  it('does not render indicator when showIndicator is false', () => {
    const { queryByText } = render(
      <Field required>
        <Field.Label>Email</Field.Label>
      </Field>
    )
    expect(queryByText('*')).not.toBeInTheDocument()
  })
})
