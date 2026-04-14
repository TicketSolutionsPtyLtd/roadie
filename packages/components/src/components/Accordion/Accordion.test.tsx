import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Accordion, accordionVariants } from '.'

describe('Accordion', () => {
  it('renders with default props', () => {
    const { container } = render(
      <Accordion>
        <Accordion.Item>
          <Accordion.Trigger>Trigger 1</Accordion.Trigger>
          <Accordion.Content>Content 1</Accordion.Content>
        </Accordion.Item>
      </Accordion>
    )
    expect(container.firstElementChild).toBeInTheDocument()
    expect(container.firstElementChild).toHaveClass(
      'grid',
      'w-full',
      'emphasis-normal'
    )
  })

  it('renders with default emphasis variant', () => {
    const classes = accordionVariants()
    expect(classes).toContain('emphasis-normal')
    expect(classes).toContain('rounded-xl')
  })

  it('renders with subtle emphasis variant', () => {
    const classes = accordionVariants({ emphasis: 'subtle' })
    expect(classes).toContain('gap-0.5')
  })

  it('renders with subtler emphasis variant', () => {
    const classes = accordionVariants({ emphasis: 'subtler' })
    expect(classes).toContain('grid')
  })

  it('applies emphasis-subtle to items in subtle variant', () => {
    const { container } = render(
      <Accordion emphasis='subtle'>
        <Accordion.Item>
          <Accordion.Trigger>Trigger</Accordion.Trigger>
          <Accordion.Content>Content</Accordion.Content>
        </Accordion.Item>
      </Accordion>
    )
    expect(container.firstElementChild).toHaveClass('gap-0.5')
    const item = container.querySelector('[class*="emphasis-subtle"]')
    expect(item).toBeInTheDocument()
  })

  it('renders native details/summary elements', () => {
    const { container } = render(
      <Accordion>
        <Accordion.Item>
          <Accordion.Trigger>Click me</Accordion.Trigger>
          <Accordion.Content>Hidden</Accordion.Content>
        </Accordion.Item>
      </Accordion>
    )
    expect(container.querySelector('details')).toBeInTheDocument()
    expect(container.querySelector('summary')).toBeInTheDocument()
    expect(container.querySelector('summary')).toHaveTextContent('Click me')
  })

  it('toggles content on trigger click', async () => {
    const user = userEvent.setup()

    const { container, getByText } = render(
      <Accordion>
        <Accordion.Item>
          <Accordion.Trigger>Toggle</Accordion.Trigger>
          <Accordion.Content>Revealed content</Accordion.Content>
        </Accordion.Item>
      </Accordion>
    )

    const details = container.querySelector('details')!
    expect(details).not.toHaveAttribute('open')

    await user.click(getByText('Toggle'))
    expect(details).toHaveAttribute('open')
  })

  it('renders multiple items', () => {
    const { getByText } = render(
      <Accordion>
        <Accordion.Item>
          <Accordion.Trigger>First</Accordion.Trigger>
          <Accordion.Content>Content 1</Accordion.Content>
        </Accordion.Item>
        <Accordion.Item>
          <Accordion.Trigger>Second</Accordion.Trigger>
          <Accordion.Content>Content 2</Accordion.Content>
        </Accordion.Item>
      </Accordion>
    )
    expect(getByText('First')).toBeInTheDocument()
    expect(getByText('Second')).toBeInTheDocument()
  })

  it('sets shared name attribute in single mode', () => {
    const { container } = render(
      <Accordion type='single'>
        <Accordion.Item>
          <Accordion.Trigger>A</Accordion.Trigger>
          <Accordion.Content>Content A</Accordion.Content>
        </Accordion.Item>
        <Accordion.Item>
          <Accordion.Trigger>B</Accordion.Trigger>
          <Accordion.Content>Content B</Accordion.Content>
        </Accordion.Item>
      </Accordion>
    )
    const details = container.querySelectorAll('details')
    expect(details[0]).toHaveAttribute('name')
    expect(details[1]).toHaveAttribute('name')
    expect(details[0]!.getAttribute('name')).toBe(
      details[1]!.getAttribute('name')
    )
  })

  it('omits name attribute in multiple mode', () => {
    const { container } = render(
      <Accordion type='multiple'>
        <Accordion.Item>
          <Accordion.Trigger>A</Accordion.Trigger>
          <Accordion.Content>Content A</Accordion.Content>
        </Accordion.Item>
        <Accordion.Item>
          <Accordion.Trigger>B</Accordion.Trigger>
          <Accordion.Content>Content B</Accordion.Content>
        </Accordion.Item>
      </Accordion>
    )
    const details = container.querySelectorAll('details')
    expect(details[0]).not.toHaveAttribute('name')
    expect(details[1]).not.toHaveAttribute('name')
  })

  it('applies is-disclosure-animated class to items', () => {
    const { container } = render(
      <Accordion>
        <Accordion.Item>
          <Accordion.Trigger>Trigger</Accordion.Trigger>
          <Accordion.Content>Content</Accordion.Content>
        </Accordion.Item>
      </Accordion>
    )
    const details = container.querySelector('details')
    expect(details).toHaveClass('is-disclosure-animated')
  })

  it('applies custom className to root', () => {
    const classes = accordionVariants({ className: 'custom-class' })
    expect(classes).toContain('custom-class')
  })
})
