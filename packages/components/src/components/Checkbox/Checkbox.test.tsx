import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Checkbox, checkboxVariants } from '.'
import { Field } from '../Field'

describe('Checkbox', () => {
  it('renders a checkbox named by its label', () => {
    const { getByRole } = render(<Checkbox label='Send me event news' />)
    expect(
      getByRole('checkbox', { name: 'Send me event news' })
    ).toBeInTheDocument()
  })

  it('toggles when its label is clicked', async () => {
    const user = userEvent.setup()
    const onCheckedChange = vi.fn()
    const { getByRole, getByText } = render(
      <Checkbox label='Send me event news' onCheckedChange={onCheckedChange} />
    )
    await user.click(getByText('Send me event news'))
    expect(getByRole('checkbox')).toHaveAttribute('aria-checked', 'true')
    expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything())
  })

  it('toggles with the space key', async () => {
    const user = userEvent.setup()
    const { getByRole } = render(<Checkbox label='Send me event news' />)
    getByRole('checkbox').focus()
    await user.keyboard(' ')
    expect(getByRole('checkbox')).toHaveAttribute('aria-checked', 'true')
  })

  it('shows a check icon when checked', () => {
    const { container } = render(<Checkbox label='Agree' defaultChecked />)
    const indicator = container.querySelector(
      '[data-slot="checkbox-indicator"]'
    )!
    expect(indicator).toBeInTheDocument()
    expect(indicator).toHaveAttribute('data-checked')
  })

  it('shows a minus icon and mixed state when indeterminate', () => {
    const { container, getByRole } = render(
      <Checkbox label='All genres' indeterminate />
    )
    expect(getByRole('checkbox')).toHaveAttribute('aria-checked', 'mixed')
    expect(
      container.querySelector('[data-slot="checkbox-indicator"]')
    ).toHaveAttribute('data-indeterminate')
  })

  it('is named by its label and described by its description', () => {
    const { getByRole } = render(
      <Checkbox label='Agree' description='You can opt out any time.' />
    )
    const checkbox = getByRole('checkbox', { name: 'Agree' })
    expect(checkbox).toHaveAccessibleDescription('You can opt out any time.')
  })

  it('is described by both its description and the Field text', () => {
    const { getByRole } = render(
      <Field>
        <Checkbox label='Agree' description='You can opt out any time.' />
        <Field.HelperText>One email a week</Field.HelperText>
      </Field>
    )
    expect(
      getByRole('checkbox', { name: 'Agree' })
    ).toHaveAccessibleDescription('You can opt out any time. One email a week')
  })

  it('defaults to subtler emphasis', () => {
    const { container } = render(<Checkbox label='Agree' />)
    const label = container.querySelector('[data-slot="checkbox"]')!
    expect(label.tagName).toBe('LABEL')
    expect(label).toHaveClass('emphasis-subtler')
  })

  it('renders the normal emphasis card', () => {
    const { container } = render(<Checkbox label='Agree' emphasis='normal' />)
    const label = container.querySelector('[data-slot="checkbox"]')!
    expect(label).toHaveClass('emphasis-normal')
    expect(label).toHaveClass('rounded-xl')
  })

  it('exposes variant classes', () => {
    expect(checkboxVariants()).toContain('emphasis-subtler')
    expect(checkboxVariants({ emphasis: 'normal' })).toContain('rounded-xl')
    expect(checkboxVariants({ className: 'custom' })).toContain('custom')
  })

  it('marks itself invalid', () => {
    const { getByRole } = render(<Checkbox label='Agree' invalid />)
    expect(getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true')
  })

  describe('in a Field', () => {
    it('inherits invalid, required and disabled', () => {
      const { getByRole } = render(
        <Field invalid required disabled>
          <Checkbox label='I agree to the terms' />
        </Field>
      )
      const checkbox = getByRole('checkbox')
      expect(checkbox).toHaveAttribute('aria-invalid', 'true')
      expect(checkbox).toHaveAttribute('aria-required', 'true')
      expect(checkbox).toHaveAttribute('aria-disabled', 'true')
    })

    it('is described by the error text when invalid', () => {
      const { getByRole, getByText } = render(
        <Field invalid>
          <Checkbox label='I agree to the terms' />
          <Field.ErrorText>Accept the terms to continue</Field.ErrorText>
        </Field>
      )
      expect(getByRole('checkbox')).toHaveAttribute(
        'aria-describedby',
        getByText('Accept the terms to continue').id
      )
    })

    it('is described by the helper text when valid', () => {
      const { getByRole, getByText } = render(
        <Field>
          <Checkbox label='Send me event news' />
          <Field.HelperText>One email a week</Field.HelperText>
        </Field>
      )
      expect(getByRole('checkbox')).toHaveAttribute(
        'aria-describedby',
        getByText('One email a week').id
      )
    })

    it('lets its own props win over the Field', () => {
      const { getByRole } = render(
        <Field invalid>
          <Checkbox label='Agree' invalid={false} />
        </Field>
      )
      expect(getByRole('checkbox')).not.toHaveAttribute('aria-invalid')
    })
  })
})
