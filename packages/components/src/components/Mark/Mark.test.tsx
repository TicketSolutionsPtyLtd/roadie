import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Mark } from './index'

describe('Mark', () => {
  it('renders with default props', () => {
    const { container } = render(<Mark>Marked text</Mark>)
    const mark = container.querySelector('mark')
    expect(mark).toBeInTheDocument()
    expect(mark).toHaveTextContent('Marked text')
    expect(mark).toHaveClass('intent-info') // default intent
  })

  it('renders with different intents', () => {
    const { rerender, container } = render(<Mark intent='accent'>Accent</Mark>)
    let mark = container.querySelector('mark')
    expect(mark).toHaveClass('intent-accent')

    rerender(<Mark intent='success'>Success</Mark>)
    mark = container.querySelector('mark')
    expect(mark).toHaveClass('intent-success')

    rerender(<Mark intent='danger'>Danger</Mark>)
    mark = container.querySelector('mark')
    expect(mark).toHaveClass('intent-danger')
  })

  it('applies emphasis classes', () => {
    const { container } = render(<Mark>Styled</Mark>)
    const mark = container.querySelector('mark')
    expect(mark).toHaveClass('bg-subtle', 'text-default')
  })

  it('applies custom className', () => {
    const { container } = render(
      <Mark className='custom-class'>Marked text</Mark>
    )
    const mark = container.querySelector('mark')
    expect(mark).toHaveClass('custom-class')
  })

  it('forwards additional HTML attributes', () => {
    const { container } = render(
      <Mark data-testid='mark' title='tooltip'>
        Marked text
      </Mark>
    )
    const mark = container.querySelector('mark')
    expect(mark).toHaveAttribute('data-testid', 'mark')
    expect(mark).toHaveAttribute('title', 'tooltip')
  })

  it('renders children correctly', () => {
    const { container } = render(
      <Mark>
        This is <strong>important</strong> text
      </Mark>
    )
    const mark = container.querySelector('mark')
    expect(mark).toBeInTheDocument()
    expect(mark?.textContent).toBe('This is important text')
    const strong = mark?.querySelector('strong')
    expect(strong).toHaveTextContent('important')
  })
})
