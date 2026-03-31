import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Heading } from './index'

describe('Heading', () => {
  it('renders with default props', () => {
    const { getByText } = render(<Heading>Hello World</Heading>)
    const heading = getByText('Hello World')
    expect(heading).toBeInTheDocument()
    expect(heading.tagName.toLowerCase()).toBe('h2')
    expect(heading).toHaveClass('emphasis-strong-fg')
  })

  it('renders with different heading levels', () => {
    const levels = [1, 2, 3, 4, 5, 6] as const
    levels.forEach((level) => {
      const { getByText, unmount } = render(
        <Heading level={level}>{`h${level} Heading`}</Heading>
      )
      const heading = getByText(`h${level} Heading`)
      expect(heading.tagName.toLowerCase()).toBe(`h${level}`)
      unmount()
    })
  })

  it('renders with as prop override', () => {
    const { getByText } = render(<Heading as="h1">H1 Heading</Heading>)
    expect(getByText('H1 Heading').tagName.toLowerCase()).toBe('h1')
  })

  it('renders with different emphasis', () => {
    const { rerender, getByText } = render(
      <Heading emphasis="default">Default</Heading>
    )
    expect(getByText('Default')).toHaveClass('emphasis-strong-fg')

    rerender(<Heading emphasis="strong">Strong</Heading>)
    expect(getByText('Strong')).toHaveClass('font-black')

    rerender(<Heading emphasis="subtle">Subtle</Heading>)
    expect(getByText('Subtle')).toHaveClass('emphasis-subtle-fg')

    rerender(<Heading emphasis="subtler">Subtler</Heading>)
    expect(getByText('Subtler')).toHaveClass('emphasis-subtler-fg')
  })

  it('renders with different intents', () => {
    const { rerender, getByText } = render(
      <Heading intent="brand">Brand</Heading>
    )
    expect(getByText('Brand')).toHaveClass('intent-brand')

    rerender(<Heading intent="accent">Accent</Heading>)
    expect(getByText('Accent')).toHaveClass('intent-accent')
  })

  it('renders with different sizes', () => {
    const { rerender, getByText } = render(
      <Heading size="3xl">Big</Heading>
    )
    expect(getByText('Big')).toHaveClass('text-3xl')

    rerender(<Heading size="lg">Medium</Heading>)
    expect(getByText('Medium')).toHaveClass('text-lg')
  })

  it('forwards additional HTML attributes', () => {
    const { getByTestId } = render(
      <Heading data-testid="heading" title="tooltip" aria-label="Accessible">
        Styled Heading
      </Heading>
    )
    const heading = getByTestId('heading')
    expect(heading).toHaveAttribute('title', 'tooltip')
    expect(heading).toHaveAttribute('aria-label', 'Accessible')
  })

  it('combines multiple props', () => {
    const { getByText } = render(
      <Heading
        as="h1"
        emphasis="strong"
        intent="brand"
        size="3xl"
        className="custom-class"
      >
        Combined styles
      </Heading>
    )
    const heading = getByText('Combined styles')
    expect(heading.tagName.toLowerCase()).toBe('h1')
    expect(heading).toHaveClass(
      'font-black',
      'intent-brand',
      'text-3xl',
      'custom-class'
    )
  })
})
