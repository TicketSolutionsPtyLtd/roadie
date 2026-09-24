import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { NumberField, numberFieldGroupVariants } from '.'
import { Field } from '../Field'

describe('NumberField', () => {
  it('NumberField and NumberField.Root are the same component reference', () => {
    expect(NumberField).toBe(NumberField.Root)
  })

  it('renders a stepper by default', () => {
    const { container } = render(
      <NumberField aria-label='Tickets' defaultValue={1} />
    )
    expect(
      container.querySelector('[data-slot="number-field"]')
    ).toBeInTheDocument()
    expect(
      container.querySelector('[data-slot="number-field-group"]')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Decrease' })).toHaveAttribute(
      'data-slot',
      'number-field-decrement'
    )
    expect(screen.getByRole('button', { name: 'Increase' })).toHaveAttribute(
      'data-slot',
      'number-field-increment'
    )
    expect(screen.getByRole('textbox', { name: 'Tickets' })).toHaveValue('1')
  })

  it('renders composed children instead of the default stepper', () => {
    render(
      <NumberField defaultValue={3}>
        <NumberField.Group>
          <NumberField.Input aria-label='Seats' />
        </NumberField.Group>
      </NumberField>
    )
    expect(screen.getByRole('textbox', { name: 'Seats' })).toHaveValue('3')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('steps with the buttons and stops at max', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <NumberField
        aria-label='Tickets'
        defaultValue={9}
        min={0}
        max={10}
        onValueChange={onValueChange}
      />
    )
    const increase = screen.getByRole('button', { name: 'Increase' })
    await user.click(increase)
    expect(screen.getByRole('textbox')).toHaveValue('10')
    expect(onValueChange).toHaveBeenLastCalledWith(10, expect.anything())
    expect(increase).toBeDisabled()
  })

  it('disables decrement at min', () => {
    render(<NumberField aria-label='Tickets' defaultValue={0} min={0} />)
    expect(screen.getByRole('button', { name: 'Decrease' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Increase' })).not.toBeDisabled()
  })

  it('steps with the arrow keys', () => {
    render(<NumberField aria-label='Tickets' defaultValue={2} />)
    const input = screen.getByRole('textbox')
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    expect(input).toHaveValue('3')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(input).toHaveValue('1')
  })

  it('formats with Intl options', () => {
    render(
      <NumberField
        aria-label='Donation'
        locale='en-AU'
        defaultValue={25}
        format={{ style: 'currency', currency: 'AUD' }}
      />
    )
    expect(screen.getByRole('textbox')).toHaveValue('$25.00')
  })

  it('applies size and emphasis from the root to the group', () => {
    const { container } = render(
      <NumberField aria-label='Tickets' size='lg' emphasis='subtle' />
    )
    const group = container.querySelector('[data-slot="number-field-group"]')
    expect(group).toHaveClass('h-12')
    expect(group).toHaveClass('bg-subtle')
  })

  it('disables the whole field', () => {
    render(<NumberField aria-label='Tickets' defaultValue={2} disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Increase' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Decrease' })).toBeDisabled()
  })

  it('marks the steppers unavailable when read only', () => {
    render(<NumberField aria-label='Tickets' defaultValue={2} readOnly />)
    const increase = screen.getByRole('button', { name: 'Increase' })
    expect(increase).toHaveAttribute('aria-disabled', 'true')
    expect(increase).toHaveClass('aria-disabled:text-subtler')
  })

  describe('group variants', () => {
    it('defaults to the field emphasis without an intent', () => {
      const classes = numberFieldGroupVariants()
      expect(classes).toContain('emphasis-field')
      expect(classes).toContain('is-interactive-field-group')
      expect(classes).toContain('h-10')
      expect(classes).not.toContain('intent-')
    })

    it('sizes', () => {
      expect(numberFieldGroupVariants({ size: 'sm' })).toContain('h-8')
      expect(numberFieldGroupVariants({ size: 'lg' })).toContain('h-12')
    })
  })

  describe('inside Field', () => {
    it('wires the label, helper text and required state', () => {
      render(
        <Field required>
          <Field.Label>Tickets</Field.Label>
          <NumberField min={0} max={10} defaultValue={1} />
          <Field.HelperText>Up to 10 per order</Field.HelperText>
        </Field>
      )
      const input = screen.getByRole('textbox', { name: 'Tickets' })
      expect(input).toBeRequired()
      expect(input).toHaveAccessibleDescription('Up to 10 per order')
    })

    it('inherits invalid and points at the error text', () => {
      const { container } = render(
        <Field invalid>
          <Field.Label>Tickets</Field.Label>
          <NumberField defaultValue={0} />
          <Field.ErrorText>Choose at least one ticket</Field.ErrorText>
        </Field>
      )
      const input = screen.getByRole('textbox', { name: 'Tickets' })
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(input).toHaveAccessibleDescription('Choose at least one ticket')
      expect(
        container.querySelector('[data-slot="number-field-group"]')
      ).toHaveAttribute('aria-invalid', 'true')
    })

    it('inherits disabled', () => {
      render(
        <Field disabled>
          <Field.Label>Tickets</Field.Label>
          <NumberField defaultValue={1} />
        </Field>
      )
      expect(screen.getByRole('textbox', { name: 'Tickets' })).toBeDisabled()
    })

    it('lets root props override the Field', () => {
      render(
        <Field invalid>
          <Field.Label>Tickets</Field.Label>
          <NumberField invalid={false} defaultValue={1} />
        </Field>
      )
      expect(
        screen.getByRole('textbox', { name: 'Tickets' })
      ).not.toHaveAttribute('aria-invalid')
    })
  })

  it('renders a scrub area', () => {
    const { container } = render(
      <NumberField defaultValue={5}>
        <NumberField.ScrubArea>
          <label htmlFor='volume'>Volume</label>
        </NumberField.ScrubArea>
        <NumberField.Group>
          <NumberField.Input id='volume' />
        </NumberField.Group>
      </NumberField>
    )
    expect(
      container.querySelector('[data-slot="number-field-scrub-area"]')
    ).toHaveClass('cursor-ew-resize')
  })
})
