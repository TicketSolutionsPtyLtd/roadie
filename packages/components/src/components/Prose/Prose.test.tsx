import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Prose } from '.'

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

  it('renders the core prose class', () => {
    const { container } = render(<Prose>Content</Prose>)
    expect(container.firstElementChild).toHaveClass('prose')
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

  it('renders as a custom element via as prop', () => {
    const { container } = render(
      <Prose as='article'>
        <p>Content</p>
      </Prose>
    )
    const el = container.firstElementChild as HTMLElement
    expect(el.tagName.toLowerCase()).toBe('article')
  })

  it('renders as section', () => {
    const { container } = render(
      <Prose as='section' size='lg'>
        <p>Content</p>
      </Prose>
    )
    const el = container.firstElementChild as HTMLElement
    expect(el.tagName.toLowerCase()).toBe('section')
    expect(el).toHaveClass('prose')
  })

  it('swaps the element via render and keeps prose classes', () => {
    const { container } = render(
      <Prose render={<article />}>
        <p>Content</p>
      </Prose>
    )
    const el = container.firstElementChild as HTMLElement
    expect(el.tagName.toLowerCase()).toBe('article')
    expect(el).toHaveAttribute('data-slot', 'prose')
    expect(el).toHaveClass('prose')
  })
})
