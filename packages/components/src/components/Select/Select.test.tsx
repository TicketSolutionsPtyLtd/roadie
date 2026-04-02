import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Select, selectTriggerVariants } from '.'

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
    expect(classes).toContain('is-field-interactive')
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
    expect(selectTriggerVariants({ emphasis: 'default' })).toContain(
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
})
