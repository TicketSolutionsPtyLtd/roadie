import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Separator } from '.'

describe('Separator', () => {
  it('renders with default props', () => {
    const { container } = render(<Separator />)
    const separator = container.firstElementChild!
    expect(separator).toBeInTheDocument()
    expect(separator).toHaveAttribute('role', 'separator')
    expect(separator).toHaveAttribute('aria-orientation', 'horizontal')
  })

  it('renders horizontal orientation by default', () => {
    const { container } = render(<Separator />)
    const separator = container.firstElementChild!
    expect(separator).toHaveClass('h-px', 'w-full', 'border-t')
  })

  it('renders vertical orientation', () => {
    const { container } = render(<Separator orientation='vertical' />)
    const separator = container.firstElementChild!
    expect(separator).toHaveAttribute('aria-orientation', 'vertical')
    expect(separator).toHaveClass('w-px', 'border-l')
  })

  it('applies emphasis class', () => {
    const { container } = render(<Separator />)
    expect(container.firstElementChild).toHaveClass('emphasis-subtle-border')
  })

  it('applies custom className', () => {
    const { container } = render(<Separator className='custom-class' />)
    expect(container.firstElementChild).toHaveClass('custom-class')
  })

  it('forwards HTML attributes', () => {
    const { container } = render(
      <Separator data-testid='my-separator' id='sep-1' />
    )
    const separator = container.firstElementChild!
    expect(separator).toHaveAttribute('data-testid', 'my-separator')
    expect(separator).toHaveAttribute('id', 'sep-1')
  })
})
