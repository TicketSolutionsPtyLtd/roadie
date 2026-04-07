import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Select, selectTriggerVariants } from '.'
import { Field } from '../Field'

describe('Select', () => {
  it('renders root component', () => {
    const { container } = render(
      <Select>
        <Select.Trigger>
          <Select.Value placeholder='Pick one' />
          <Select.Icon />
        </Select.Trigger>
      </Select>
    )
    expect(container).toBeInTheDocument()
  })

  it('renders Trigger with default variant classes', () => {
    const classes = selectTriggerVariants()
    expect(classes).toContain('emphasis-raised')
    expect(classes).toContain('is-interactive-field')
    expect(classes).not.toContain('intent-neutral')
  })

  it('renders Trigger with different intents', () => {
    expect(selectTriggerVariants({ intent: 'accent' })).toContain(
      'intent-accent'
    )
    expect(selectTriggerVariants({ intent: 'danger' })).toContain(
      'intent-danger'
    )
    expect(selectTriggerVariants({ intent: 'success' })).toContain(
      'intent-success'
    )
  })

  it('renders Trigger with different emphasis', () => {
    expect(selectTriggerVariants({ emphasis: 'normal' })).toContain(
      'emphasis-raised'
    )
    expect(selectTriggerVariants({ emphasis: 'subtle' })).toContain('bg-subtle')
  })

  it('renders Trigger with different sizes', () => {
    expect(selectTriggerVariants({ size: 'sm' })).toContain('h-8')
    expect(selectTriggerVariants({ size: 'md' })).toContain('h-10')
    expect(selectTriggerVariants({ size: 'lg' })).toContain('h-12')
  })

  it('renders Label sub-component', () => {
    const { getByText } = render(
      <Select>
        <Select.Label>Choose option</Select.Label>
        <Select.Trigger>
          <Select.Value placeholder='Pick one' />
          <Select.Icon />
        </Select.Trigger>
      </Select>
    )
    expect(getByText('Choose option')).toBeInTheDocument()
  })

  it('renders with custom className on Trigger', () => {
    const classes = selectTriggerVariants({ className: 'custom-class' })
    expect(classes).toContain('custom-class')
  })

  it('renders ErrorText when invalid is not set', () => {
    const { getByText } = render(
      <Select>
        <Select.ErrorText>Error message</Select.ErrorText>
      </Select>
    )
    expect(getByText('Error message')).toBeInTheDocument()
  })

  it('hides ErrorText when invalid is false', () => {
    const { queryByText } = render(
      <Select invalid={false}>
        <Select.ErrorText>Error message</Select.ErrorText>
      </Select>
    )
    expect(queryByText('Error message')).not.toBeInTheDocument()
  })

  it('shows ErrorText when invalid is true', () => {
    const { getByText } = render(
      <Select invalid>
        <Select.ErrorText>Error message</Select.ErrorText>
      </Select>
    )
    expect(getByText('Error message')).toBeInTheDocument()
  })

  it('renders RequiredIndicator on Label when showIndicator and required', () => {
    const { getByText } = render(
      <Select required>
        <Select.Label showIndicator>Industry</Select.Label>
        <Select.Trigger>
          <Select.Value placeholder='Pick one' />
          <Select.Icon />
        </Select.Trigger>
      </Select>
    )
    expect(getByText('*')).toBeInTheDocument()
  })

  it('renders OptionalIndicator on Label when showIndicator and not required', () => {
    const { getByText } = render(
      <Select>
        <Select.Label showIndicator>Industry</Select.Label>
        <Select.Trigger>
          <Select.Value placeholder='Pick one' />
          <Select.Icon />
        </Select.Trigger>
      </Select>
    )
    expect(getByText('(optional)')).toBeInTheDocument()
  })

  it('renders Content convenience wrapper', () => {
    const { container } = render(
      <Select>
        <Select.Trigger>
          <Select.Value placeholder='Pick one' />
          <Select.Icon />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value='a'>Option A</Select.Item>
        </Select.Content>
      </Select>
    )
    expect(container).toBeInTheDocument()
  })

  it('auto-wraps string children in Item with ItemText and ItemIndicator', () => {
    const { container } = render(
      <Select defaultValue='a'>
        <Select.Trigger>
          <Select.Value />
          <Select.Icon />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value='a'>Option A</Select.Item>
        </Select.Content>
      </Select>
    )
    expect(container).toBeInTheDocument()
  })

  it('inherits invalid from Field context', () => {
    const { container } = render(
      <Field invalid>
        <Select>
          <Select.Trigger>
            <Select.Value placeholder='Pick one' />
            <Select.Icon />
          </Select.Trigger>
        </Select>
        <Field.ErrorText>Error</Field.ErrorText>
      </Field>
    )
    const trigger = container.querySelector('button')!
    expect(trigger).toHaveAttribute('aria-invalid', 'true')
  })

  it('standalone Select still works without Field', () => {
    const { container } = render(
      <Select>
        <Select.Trigger>
          <Select.Value placeholder='Pick one' />
          <Select.Icon />
        </Select.Trigger>
      </Select>
    )
    const trigger = container.querySelector('button')!
    expect(trigger).not.toHaveAttribute('aria-labelledby')
    expect(trigger).not.toHaveAttribute('aria-invalid')
  })

  it('Select props override Field context', () => {
    const { container } = render(
      <Field invalid>
        <Select invalid={false}>
          <Select.Trigger>
            <Select.Value placeholder='Pick one' />
            <Select.Icon />
          </Select.Trigger>
        </Select>
      </Field>
    )
    const trigger = container.querySelector('button')!
    expect(trigger).not.toHaveAttribute('aria-invalid')
  })
})
