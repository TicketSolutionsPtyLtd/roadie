import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Field } from '.'
import { Autocomplete } from '../Autocomplete'
import { Combobox } from '../Combobox'
import { RadioGroup } from '../RadioGroup'
import { Select } from '../Select'

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

  it('renders Field.Label with id attribute', () => {
    const { container } = render(
      <Field>
        <Field.Label>Email</Field.Label>
        <Field.Input />
      </Field>
    )
    const label = container.querySelector('label')!
    expect(label).toHaveAttribute('id')
    expect(label.id).toContain('-label')
  })
})

describe('Field + Select integration', () => {
  it('Select trigger gets aria-labelledby matching Field.Label id', () => {
    const { container } = render(
      <Field>
        <Field.Label>Industry</Field.Label>
        <Select>
          <Select.Trigger>
            <Select.Value placeholder='Pick one' />
            <Select.Icon />
          </Select.Trigger>
        </Select>
      </Field>
    )
    const label = container.querySelector('label')!
    const trigger = container.querySelector('button')!
    expect(trigger).toHaveAttribute('aria-labelledby', label.id)
  })

  it('Select inherits invalid and required from Field context', () => {
    const { container } = render(
      <Field invalid required>
        <Field.Label showIndicator>Industry</Field.Label>
        <Select>
          <Select.Trigger>
            <Select.Value placeholder='Pick one' />
            <Select.Icon />
          </Select.Trigger>
        </Select>
        <Field.ErrorText>Required</Field.ErrorText>
      </Field>
    )
    const trigger = container.querySelector('button')!
    expect(trigger).toHaveAttribute('aria-invalid', 'true')
    expect(trigger).toHaveAttribute('aria-required', 'true')
    expect(container.querySelector('[role="alert"]')).toBeInTheDocument()
  })

  it('Select trigger gets aria-describedby pointing to error text when invalid', () => {
    const { container } = render(
      <Field invalid>
        <Field.Label>Industry</Field.Label>
        <Select>
          <Select.Trigger>
            <Select.Value placeholder='Pick one' />
            <Select.Icon />
          </Select.Trigger>
        </Select>
        <Field.ErrorText>Required</Field.ErrorText>
      </Field>
    )
    const trigger = container.querySelector('button')!
    const errorText = container.querySelector('[role="alert"]')!
    expect(trigger).toHaveAttribute('aria-describedby', errorText.id)
  })

  it('Select props override Field context', () => {
    const { queryByText } = render(
      <Field invalid>
        <Select invalid={false}>
          <Select.Trigger>
            <Select.Value placeholder='Pick one' />
            <Select.Icon />
          </Select.Trigger>
          <Select.ErrorText>Should be hidden</Select.ErrorText>
        </Select>
      </Field>
    )
    expect(queryByText('Should be hidden')).not.toBeInTheDocument()
  })
})

describe('Field + RadioGroup integration', () => {
  it('RadioGroup gets aria-labelledby matching Field.Label id', () => {
    const { container } = render(
      <Field>
        <Field.Label>Contact method</Field.Label>
        <RadioGroup>
          <RadioGroup.Item value='email' label='Email' />
        </RadioGroup>
      </Field>
    )
    const label = container.querySelector('label')!
    const radioGroup = container.querySelector('[role="radiogroup"]')!
    expect(radioGroup).toHaveAttribute('aria-labelledby', label.id)
  })

  it('RadioGroup inherits invalid from Field context', () => {
    const { container } = render(
      <Field invalid>
        <Field.Label>Contact method</Field.Label>
        <RadioGroup>
          <RadioGroup.Item value='email' label='Email' />
        </RadioGroup>
        <Field.ErrorText>Required</Field.ErrorText>
      </Field>
    )
    expect(container.querySelector('[role="alert"]')).toBeInTheDocument()
  })
})

describe('Field + Combobox integration', () => {
  it('Combobox input gets id matching Field.Label htmlFor', () => {
    const { container } = render(
      <Field>
        <Field.Label>Venue</Field.Label>
        <Combobox>
          <Combobox.InputGroup>
            <Combobox.Input placeholder='Search...' />
            <Combobox.Trigger />
          </Combobox.InputGroup>
        </Combobox>
      </Field>
    )
    const label = container.querySelector('label')!
    const input = container.querySelector('input')!
    expect(label).toHaveAttribute('for', input.id)
  })

  it('Combobox input gets aria attributes from Field context when invalid', () => {
    const { container } = render(
      <Field invalid required>
        <Field.Label>Venue</Field.Label>
        <Combobox>
          <Combobox.InputGroup>
            <Combobox.Input placeholder='Search...' />
            <Combobox.Trigger />
          </Combobox.InputGroup>
        </Combobox>
        <Field.ErrorText>Required</Field.ErrorText>
      </Field>
    )
    const input = container.querySelector('input')!
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-required', 'true')
    const errorText = container.querySelector('[role="alert"]')!
    expect(input).toHaveAttribute('aria-describedby', errorText.id)
  })

  it('Combobox InputGroup gets aria-invalid when Field is invalid', () => {
    const { container } = render(
      <Field invalid>
        <Field.Label>Venue</Field.Label>
        <Combobox>
          <Combobox.InputGroup>
            <Combobox.Input placeholder='Search...' />
            <Combobox.Trigger />
          </Combobox.InputGroup>
        </Combobox>
      </Field>
    )
    const inputGroup = container.querySelector('[aria-invalid="true"]')
    expect(inputGroup).toBeInTheDocument()
  })
})

describe('Field + Autocomplete integration', () => {
  it('Autocomplete input gets id matching Field.Label htmlFor', () => {
    const { container } = render(
      <Field>
        <Field.Label>Address</Field.Label>
        <Autocomplete>
          <Autocomplete.InputGroup>
            <Autocomplete.Input placeholder='Start typing...' />
          </Autocomplete.InputGroup>
        </Autocomplete>
      </Field>
    )
    const label = container.querySelector('label')!
    const input = container.querySelector('input')!
    expect(label).toHaveAttribute('for', input.id)
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
})
