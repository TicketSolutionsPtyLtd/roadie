import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { OTPField, otpFieldInputVariants } from '.'
import { Field } from '../Field'

function slots(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLInputElement>(
      '[data-slot="otp-field-input"]'
    )
  )
}

describe('OTPField', () => {
  it('OTPField and OTPField.Root are the same component reference', () => {
    expect(OTPField).toBe(OTPField.Root)
  })

  it('renders one slot per character by default', () => {
    const { container } = render(
      <OTPField length={6} aria-label='Login code' />
    )
    expect(container.querySelector('[data-slot="otp-field"]')).toHaveAttribute(
      'role',
      'group'
    )
    const inputs = slots(container)
    expect(inputs).toHaveLength(6)
    expect(inputs[0]).toHaveAttribute('autocomplete', 'one-time-code')
    expect(inputs[0]).toHaveAttribute('inputmode', 'numeric')
    expect(inputs[5]).toHaveAttribute('inputmode', 'numeric')
  })

  it('names every slot', () => {
    render(<OTPField length={4} aria-label='Login code' />)
    expect(
      screen.getByRole('textbox', { name: 'Login code' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('textbox', { name: 'Character 2 of 4' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('textbox', { name: 'Character 4 of 4' })
    ).toBeInTheDocument()
  })

  it('names slots rendered through a render function', () => {
    render(
      <OTPField length={2} aria-label='Login code'>
        <OTPField.Input
          render={(props) => <input {...props} data-custom='' />}
        />
        <OTPField.Input
          render={(props) => <input {...props} data-custom='' />}
        />
      </OTPField>
    )
    expect(screen.getByRole('textbox', { name: 'Login code' })).toHaveAttribute(
      'data-custom'
    )
    expect(
      screen.getByRole('textbox', { name: 'Character 2 of 2' })
    ).toHaveAttribute('data-custom')
  })

  it('keeps typing working through a render element', async () => {
    const user = userEvent.setup()
    const ownRef = vi.fn()
    render(
      <OTPField length={2} aria-label='Login code'>
        <OTPField.Input render={<input ref={ownRef} />} />
        <OTPField.Input render={<input />} />
      </OTPField>
    )
    await user.type(screen.getByRole('textbox', { name: 'Login code' }), '4')
    expect(
      screen.getByRole('textbox', { name: 'Character 2 of 2' })
    ).toHaveFocus()
    expect(ownRef).toHaveBeenCalledWith(expect.any(HTMLInputElement))
  })

  it('names slots rendered through a render element', () => {
    render(
      <OTPField length={2} aria-label='Login code'>
        <OTPField.Input render={<input data-custom='' />} />
        <OTPField.Input render={<input data-custom='' />} />
      </OTPField>
    )
    expect(screen.getByRole('textbox', { name: 'Login code' })).toHaveAttribute(
      'data-custom'
    )
    expect(
      screen.getByRole('textbox', { name: 'Character 2 of 2' })
    ).toHaveAttribute('data-custom')
  })

  it('splits slots into groups with a separator between them', () => {
    const { container } = render(
      <OTPField length={6} groupSize={3} aria-label='Login code' />
    )
    const root = container.querySelector('[data-slot="otp-field"]')!
    const separators = container.querySelectorAll(
      '[data-slot="otp-field-separator"]'
    )
    expect(separators).toHaveLength(1)
    const children = Array.from(root.children)
    expect(children.indexOf(separators[0]!)).toBe(3)
  })

  it('renders composed children instead of the default slots', () => {
    const { container } = render(
      <OTPField length={2} aria-label='Code'>
        <OTPField.Input />
        <OTPField.Separator />
        <OTPField.Input />
      </OTPField>
    )
    expect(slots(container)).toHaveLength(2)
    expect(
      container.querySelector('[data-slot="otp-field-separator"]')
    ).toBeInTheDocument()
  })

  it('moves along as digits are typed and reports the complete code', async () => {
    const user = userEvent.setup()
    const onValueComplete = vi.fn()
    const { container } = render(
      <OTPField
        length={4}
        aria-label='Code'
        onValueComplete={onValueComplete}
      />
    )
    const inputs = slots(container)
    await user.click(screen.getByRole('textbox', { name: 'Code' }))
    await user.keyboard('12')
    expect(inputs[1]).toHaveValue('2')
    expect(inputs[2]).toHaveFocus()
    await user.keyboard('34')
    expect(onValueComplete).toHaveBeenCalledWith('1234', expect.anything())
  })

  it('fills every slot from a pasted code', async () => {
    const user = userEvent.setup()
    const onValueComplete = vi.fn()
    const { container } = render(
      <OTPField
        length={6}
        aria-label='Code'
        onValueComplete={onValueComplete}
      />
    )
    const inputs = slots(container)
    await user.click(screen.getByRole('textbox', { name: 'Code' }))
    await user.paste('482 913')
    expect(inputs.map((input) => input.value).join('')).toBe('482913')
    expect(onValueComplete).toHaveBeenCalledWith('482913', expect.anything())
  })

  it('ignores letters in a numeric code', async () => {
    const user = userEvent.setup()
    const { container } = render(<OTPField length={4} aria-label='Code' />)
    const inputs = slots(container)
    await user.click(screen.getByRole('textbox', { name: 'Code' }))
    await user.keyboard('a')
    expect(inputs[0]).toHaveValue('')
  })

  it('styles each slot like a field', () => {
    const { container } = render(<OTPField length={2} aria-label='Code' />)
    const [first] = slots(container)
    expect(first).toHaveClass(
      'emphasis-field',
      'is-interactive-field',
      'rounded-lg',
      'text-center',
      'tabular-nums'
    )
  })

  it('applies size and emphasis to every slot', () => {
    const { container } = render(
      <OTPField length={2} aria-label='Code' size='lg' emphasis='subtle' />
    )
    for (const input of slots(container)) {
      expect(input).toHaveClass('max-w-12', 'bg-subtle')
      expect(input).not.toHaveClass('emphasis-field')
    }
  })

  it('lets one slot override the root size', () => {
    const { container } = render(
      <OTPField length={2} aria-label='Code'>
        <OTPField.Input size='lg' />
        <OTPField.Input />
      </OTPField>
    )
    const [first, second] = slots(container)
    expect(first).toHaveClass('max-w-12')
    expect(second).toHaveClass('max-w-10')
  })

  it('exports its slot variants', () => {
    expect(otpFieldInputVariants({ size: 'sm' })).toContain('max-w-8')
  })

  it('marks every slot invalid', () => {
    const { container } = render(
      <OTPField length={3} aria-label='Code' invalid />
    )
    for (const input of slots(container)) {
      expect(input).toHaveAttribute('aria-invalid', 'true')
    }
  })

  it('disables every slot', () => {
    const { container } = render(
      <OTPField length={3} aria-label='Code' disabled />
    )
    for (const input of slots(container)) expect(input).toBeDisabled()
  })

  describe('in Field', () => {
    it('takes its label and helper text from Field', () => {
      render(
        <Field>
          <Field.Label>Verification code</Field.Label>
          <OTPField length={6} />
          <Field.HelperText>We sent a code to your email</Field.HelperText>
        </Field>
      )
      const first = screen.getByRole('textbox', { name: 'Verification code' })
      expect(first).toHaveAttribute('data-slot', 'otp-field-input')
      expect(
        screen.getByRole('group', { name: 'Verification code' })
      ).toHaveAccessibleDescription('We sent a code to your email')
    })

    it('inherits invalid and points at the error text', () => {
      const { container } = render(
        <Field invalid>
          <Field.Label>Verification code</Field.Label>
          <OTPField length={6} />
          <Field.ErrorText>That code has expired</Field.ErrorText>
        </Field>
      )
      for (const input of slots(container)) {
        expect(input).toHaveAttribute('aria-invalid', 'true')
      }
      expect(screen.getByRole('group')).toHaveAccessibleDescription(
        'That code has expired'
      )
    })

    it('inherits disabled and required', () => {
      const { container } = render(
        <Field disabled required>
          <Field.Label>Verification code</Field.Label>
          <OTPField length={4} />
        </Field>
      )
      const inputs = slots(container)
      for (const input of inputs) expect(input).toBeDisabled()
      expect(inputs[0]).toBeRequired()
    })

    it('lets its own props win over Field', () => {
      const { container } = render(
        <Field invalid>
          <Field.Label>Verification code</Field.Label>
          <OTPField length={2} invalid={false} />
        </Field>
      )
      for (const input of slots(container)) {
        expect(input).not.toHaveAttribute('aria-invalid')
      }
    })
  })
})

describe('Field text description', () => {
  it('stays on the helper text when only the control is invalid', () => {
    const { getByRole } = render(
      <Field>
        <Field.Label>Verification code</Field.Label>
        <OTPField invalid length={4} />
        <Field.HelperText>Helper</Field.HelperText>
        <Field.ErrorText>Error</Field.ErrorText>
      </Field>
    )
    expect(getByRole('group')).toHaveAccessibleDescription('Helper')
  })

  it('points at the error text when the Field is invalid', () => {
    const { getByRole } = render(
      <Field invalid>
        <Field.Label>Verification code</Field.Label>
        <OTPField length={4} />
        <Field.HelperText>Helper</Field.HelperText>
        <Field.ErrorText>Error</Field.ErrorText>
      </Field>
    )
    expect(getByRole('group')).toHaveAccessibleDescription('Error')
  })
})
