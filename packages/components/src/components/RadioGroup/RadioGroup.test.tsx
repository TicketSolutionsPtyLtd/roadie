import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { RadioGroup, radioGroupItemVariants, radioGroupVariants } from '.'

describe('RadioGroup', () => {
  it('renders with default props', () => {
    const { container } = render(
      <RadioGroup>
        <RadioGroup.Item value='a' label='Option A' />
      </RadioGroup>
    )
    expect(container).toBeInTheDocument()
  })

  it('renders with vertical direction by default', () => {
    const classes = radioGroupVariants()
    expect(classes).toContain('flex-col')
  })

  it('renders with horizontal direction', () => {
    const classes = radioGroupVariants({ direction: 'horizontal' })
    expect(classes).toContain('flex-row')
  })

  it('renders Item with subtler emphasis by default', () => {
    const classes = radioGroupItemVariants()
    expect(classes).toContain('gap-2')
    expect(classes).toContain('emphasis-subtler')
  })

  it('renders Item with normal emphasis', () => {
    const classes = radioGroupItemVariants({ emphasis: 'normal' })
    expect(classes).toContain('rounded-xl')
    expect(classes).toContain('emphasis-normal')
  })

  it('items inherit emphasis from Root', () => {
    const { container } = render(
      <RadioGroup emphasis='normal'>
        <RadioGroup.Item value='a' label='Option A' />
      </RadioGroup>
    )
    const label = container.querySelector('label')!
    expect(label).toHaveClass('emphasis-normal')
    expect(label).toHaveClass('rounded-xl')
  })

  it('items default to subtler emphasis', () => {
    const { container } = render(
      <RadioGroup>
        <RadioGroup.Item value='a' label='Option A' />
      </RadioGroup>
    )
    const label = container.querySelector('label')!
    expect(label).toHaveClass('emphasis-subtler')
  })

  it('renders Item with label text', () => {
    const { getByText } = render(
      <RadioGroup>
        <RadioGroup.Item value='a' label='Option A' />
        <RadioGroup.Item value='b' label='Option B' />
      </RadioGroup>
    )
    expect(getByText('Option A')).toBeInTheDocument()
    expect(getByText('Option B')).toBeInTheDocument()
  })

  it('applies custom className to root', () => {
    const classes = radioGroupVariants({ className: 'custom-class' })
    expect(classes).toContain('custom-class')
  })

  it('applies custom className to Item', () => {
    const classes = radioGroupItemVariants({ className: 'custom-item' })
    expect(classes).toContain('custom-item')
  })
})
