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

    rerender(<Mark intent='brand-secondary'>Brand Secondary</Mark>)
    mark = container.querySelector('mark')
    expect(mark).toHaveClass('intent-brand-secondary')

    rerender(<Mark intent='neutral-inverted'>Neutral Inverted</Mark>)
    mark = container.querySelector('mark')
    expect(mark).toHaveClass('intent-neutral')
  })

  it('applies mark color classes', () => {
    const { container } = render(<Mark>Styled</Mark>)
    const mark = container.querySelector('mark')
    expect(mark).toHaveClass('bg-mark', 'text-mark')
  })

  it('applies inverted color classes for neutral-inverted', () => {
    const { container } = render(
      <Mark intent='neutral-inverted'>Inverted</Mark>
    )
    const mark = container.querySelector('mark')
    expect(mark).not.toHaveClass('bg-mark')
    expect(mark).toHaveClass(
      'bg-[var(--color-neutral-0)]',
      'text-[var(--color-neutral-13)]'
    )
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

  it('renders as a custom element via as prop', () => {
    const { container } = render(<Mark as='span'>Span mark</Mark>)
    const span = container.querySelector('span')
    expect(span).toBeInTheDocument()
    expect(span).toHaveTextContent('Span mark')
    expect(span).toHaveClass('bg-mark', 'text-mark')
    expect(container.querySelector('mark')).toBeNull()
  })

  it('applies extra padding when as is a heading element', () => {
    const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const
    for (const tag of headings) {
      const { container } = render(<Mark as={tag}>Heading</Mark>)
      const el = container.querySelector(tag)
      expect(el).toHaveClass('px-[0.4em]', 'py-[0.2em]')
    }
  })

  it('does not apply heading padding for non-heading as values', () => {
    const { container } = render(<Mark as='span'>Span</Mark>)
    const el = container.querySelector('span')
    expect(el).not.toHaveClass('px-[0.4em]')
  })
})
