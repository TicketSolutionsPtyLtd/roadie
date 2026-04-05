import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Highlight } from './index'

describe('Highlight', () => {
  it('renders with text prop', () => {
    const { container } = render(<Highlight text='Hello World' query='World' />)
    expect(container).toHaveTextContent('Hello World')
    const mark = container.querySelector('mark')
    expect(mark).toBeInTheDocument()
    expect(mark).toHaveTextContent('World')
  })

  it('highlights only matching text', () => {
    const { container } = render(
      <Highlight text='The quick brown fox' query='quick' />
    )
    expect(container).toHaveTextContent('The quick brown fox')
    const mark = container.querySelector('mark')
    expect(mark).toHaveTextContent('quick')
  })

  it('highlights multiple matches when matchAll is true', () => {
    const { container } = render(
      <Highlight text='foo bar foo baz' query='foo' matchAll />
    )
    const marks = container.querySelectorAll('mark')
    expect(marks).toHaveLength(2)
    marks.forEach((mark: Element) => {
      expect(mark).toHaveTextContent('foo')
    })
  })

  it('highlights with case insensitive matching by default', () => {
    const { container } = render(<Highlight text='Hello World' query='hello' />)
    const mark = container.querySelector('mark')
    expect(mark).toHaveTextContent('Hello')
  })

  it('respects case when ignoreCase is false', () => {
    const { container } = render(
      <Highlight text='Hello World' query='hello' ignoreCase={false} />
    )
    const mark = container.querySelector('mark')
    expect(mark).toBeNull()
  })

  it('highlights multiple queries', () => {
    const { container } = render(
      <Highlight text='The quick brown fox' query={['quick', 'fox']} />
    )
    const marks = container.querySelectorAll('mark')
    expect(marks).toHaveLength(2)
    expect(marks[0]).toHaveTextContent('quick')
    expect(marks[1]).toHaveTextContent('fox')
  })

  it('inherits intent from parent context by default', () => {
    const { container } = render(
      <Highlight text='Highlighted text' query='Highlighted' />
    )
    const mark = container.querySelector('mark')
    expect(mark).toHaveClass('intent-info') // default intent
  })

  it('applies custom intent', () => {
    const { container } = render(
      <Highlight text='Highlighted text' query='Highlighted' intent='success' />
    )
    const mark = container.querySelector('mark')
    expect(mark).toHaveClass('intent-success')
  })

  it('returns plain text when query is empty', () => {
    const { container } = render(<Highlight text='Hello' query='' />)
    expect(container).toHaveTextContent('Hello')
    expect(container.querySelector('mark')).toBeNull()
  })

  it('returns plain text when query array is empty', () => {
    const { container } = render(<Highlight text='Hello' query={[]} />)
    expect(container).toHaveTextContent('Hello')
    expect(container.querySelector('mark')).toBeNull()
  })

  it('forwards additional HTML attributes', () => {
    const { container } = render(
      <Highlight
        text='Hello'
        query='Hello'
        data-testid='highlight'
        title='tooltip'
      />
    )
    const mark = container.querySelector('mark')
    expect(mark).toHaveAttribute('data-testid', 'highlight')
    expect(mark).toHaveAttribute('title', 'tooltip')
  })

  it('applies custom className', () => {
    const { container } = render(
      <Highlight
        text='Highlighted text'
        query='Highlighted'
        className='custom-class'
      />
    )
    const mark = container.querySelector('mark')
    expect(mark).toHaveClass('custom-class')
  })
})
