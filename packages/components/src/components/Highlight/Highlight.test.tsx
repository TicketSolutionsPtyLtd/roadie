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

  it('highlights only matching text when query is provided', () => {
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

  it('applies default color palette', () => {
    const { container } = render(
      <Highlight text='Highlighted text' query='Highlighted' />
    )
    const mark = container.querySelector('mark')
    expect(mark).toHaveClass('color-palette_information')
  })

  it('applies custom color palette', () => {
    const { container } = render(
      <Highlight
        text='Highlighted text'
        query='Highlighted'
        colorPalette='success'
      />
    )
    const mark = container.querySelector('mark')
    expect(mark).toHaveClass('color-palette_success')
  })

  it('matches exact words when exactMatch is true', () => {
    const { container } = render(
      <Highlight text='foo foobar' query='foo' exactMatch />
    )
    const marks = container.querySelectorAll('mark')
    expect(marks).toHaveLength(1)
    expect(marks[0]).toHaveTextContent('foo')
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
    expect(mark).toHaveClass('mark', 'custom-class')
  })
})
