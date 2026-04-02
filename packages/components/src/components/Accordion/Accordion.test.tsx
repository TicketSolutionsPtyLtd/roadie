import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Accordion, accordionVariants } from '.'

describe('Accordion', () => {
  it('renders with default props', () => {
    const { container } = render(
      <Accordion>
        <Accordion.Item value='item-1'>
          <Accordion.Trigger>Trigger 1</Accordion.Trigger>
          <Accordion.Content>Content 1</Accordion.Content>
        </Accordion.Item>
      </Accordion>
    )
    expect(container.firstElementChild).toBeInTheDocument()
    expect(container.firstElementChild).toHaveClass('grid', 'w-full')
  })

  it('renders with default appearance variant', () => {
    const classes = accordionVariants()
    expect(classes).toContain('grid')
  })

  it('renders with contained appearance variant', () => {
    const classes = accordionVariants({ appearance: 'contained' })
    expect(classes).toContain('[&>*+*]:border-t')
  })

  it('renders Trigger sub-component', () => {
    const { getByText } = render(
      <Accordion>
        <Accordion.Item value='item-1'>
          <Accordion.Trigger>Click me</Accordion.Trigger>
          <Accordion.Content>Hidden</Accordion.Content>
        </Accordion.Item>
      </Accordion>
    )
    expect(getByText('Click me')).toBeInTheDocument()
  })

  it('toggles content on trigger click', async () => {
    const user = userEvent.setup()

    const { getByText } = render(
      <Accordion>
        <Accordion.Item value='item-1'>
          <Accordion.Trigger>Toggle</Accordion.Trigger>
          <Accordion.Content>Revealed content</Accordion.Content>
        </Accordion.Item>
      </Accordion>
    )

    const trigger = getByText('Toggle')
    await user.click(trigger)

    expect(getByText('Revealed content')).toBeInTheDocument()
  })

  it('renders multiple items', () => {
    const { getByText } = render(
      <Accordion>
        <Accordion.Item value='item-1'>
          <Accordion.Trigger>First</Accordion.Trigger>
          <Accordion.Content>Content 1</Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value='item-2'>
          <Accordion.Trigger>Second</Accordion.Trigger>
          <Accordion.Content>Content 2</Accordion.Content>
        </Accordion.Item>
      </Accordion>
    )
    expect(getByText('First')).toBeInTheDocument()
    expect(getByText('Second')).toBeInTheDocument()
  })

  it('applies custom className to root', () => {
    const classes = accordionVariants({ className: 'custom-class' })
    expect(classes).toContain('custom-class')
  })
})
