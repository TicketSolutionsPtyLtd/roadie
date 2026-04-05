import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Prose, proseVariants } from '.'

describe('Prose', () => {
  it('renders with default props', () => {
    const { container } = render(
      <Prose>
        <p>Hello world</p>
      </Prose>
    )
    const div = container.firstElementChild as HTMLElement
    expect(div).toBeInTheDocument()
    expect(div.tagName.toLowerCase()).toBe('div')
    expect(div).toHaveTextContent('Hello world')
  })

  it('applies default size (md) variant classes', () => {
    const classes = proseVariants({ size: 'md' })
    expect(classes).toContain('text-prose')
    expect(classes).toContain('text-normal')
  })

  it('applies sm size variant', () => {
    const classes = proseVariants({ size: 'sm' })
    expect(classes).toContain('text-sm')
  })

  it('applies lg size variant', () => {
    const classes = proseVariants({ size: 'lg' })
    expect(classes).toContain('text-lg')
  })

  it('applies custom className', () => {
    const { container } = render(
      <Prose className='custom-class'>Content</Prose>
    )
    expect(container.firstElementChild).toHaveClass('custom-class')
  })

  it('forwards HTML attributes', () => {
    const { container } = render(
      <Prose data-testid='my-prose' id='prose-1'>
        Content
      </Prose>
    )
    const div = container.firstElementChild as HTMLElement
    expect(div).toHaveAttribute('data-testid', 'my-prose')
    expect(div).toHaveAttribute('id', 'prose-1')
  })
})
