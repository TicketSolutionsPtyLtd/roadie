import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Popover } from '.'
import { PopoverBody } from './PopoverBody'
import { PopoverFooter } from './PopoverFooter'
import { PopoverHeader } from './PopoverHeader'
import { PopoverPopup } from './PopoverPopup'

// Base UI's Popup requires its Root's React context, so it cannot mount bare.
// Wrap it in an open Root + Portal + Positioner; the popup is portaled into
// document.body, so query there rather than the render container.
function renderPopup(ui: React.ReactElement) {
  render(
    <PopoverPrimitive.Root open>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner>{ui}</PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
  return document.body.querySelector('[data-slot="popover-popup"]')!
}

describe('PopoverPopup', () => {
  it('renders with base surface classes and no intent by default', () => {
    const popup = renderPopup(<PopoverPopup>Panel</PopoverPopup>)
    expect(popup).toBeInTheDocument()
    expect(popup).toHaveClass('rounded-xl', 'emphasis-floating')
    expect(popup.className).not.toMatch(/\bintent-/)
  })

  it('applies the intent class when intent is set', () => {
    const popup = renderPopup(
      <PopoverPopup intent='danger'>Panel</PopoverPopup>
    )
    expect(popup).toHaveClass('intent-danger')
  })
})

describe('Popover presentational leaves', () => {
  it('Header renders a grid container', () => {
    const { container } = render(<PopoverHeader>Title</PopoverHeader>)
    const el = container.querySelector('[data-slot="popover-header"]')!
    expect(el).toHaveClass('grid')
  })

  it('Body renders its content', () => {
    const { getByText } = render(<PopoverBody>Content</PopoverBody>)
    expect(getByText('Content')).toBeInTheDocument()
  })

  it('Footer renders a centered flex actions row', () => {
    const { container } = render(<PopoverFooter>Actions</PopoverFooter>)
    const el = container.querySelector('[data-slot="popover-footer"]')!
    expect(el).toHaveClass('flex', 'justify-center')
  })
})

describe('Popover (assembled)', () => {
  it('Popover and Popover.Root are the same reference', () => {
    expect(Popover).toBe(Popover.Root)
  })

  it('opens on trigger click and closes via Close, with confirm action', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()

    render(
      <Popover>
        <Popover.Trigger>Delete</Popover.Trigger>
        <Popover.Content intent='danger'>
          <Popover.Header>
            <Popover.Title>Delete item?</Popover.Title>
            <Popover.Description>This cannot be undone.</Popover.Description>
          </Popover.Header>
          <Popover.Footer>
            <Popover.Close>Cancel</Popover.Close>
            <button onClick={onConfirm}>Confirm</button>
          </Popover.Footer>
        </Popover.Content>
      </Popover>
    )

    expect(screen.queryByText('Delete item?')).not.toBeInTheDocument()

    await user.click(screen.getByText('Delete'))
    expect(await screen.findByText('Delete item?')).toBeInTheDocument()

    await user.click(screen.getByText('Confirm'))
    expect(onConfirm).toHaveBeenCalledOnce()

    await user.click(screen.getByText('Cancel'))
    await waitFor(() =>
      expect(screen.queryByText('Delete item?')).not.toBeInTheDocument()
    )
  })

  it('renders a visible arrow shape when Popover.Arrow is included', async () => {
    const user = userEvent.setup()

    render(
      <Popover>
        <Popover.Trigger>Open</Popover.Trigger>
        <Popover.Content>
          <Popover.Arrow />
          <Popover.Body>Anchored content</Popover.Body>
        </Popover.Content>
      </Popover>
    )

    await user.click(screen.getByText('Open'))
    await screen.findByText('Anchored content')

    const arrow = document.querySelector('[data-slot="popover-arrow"]')
    expect(arrow).toBeInTheDocument()
    // The arrow must render a filled triangle, not just Base UI's empty
    // positioning div — otherwise it is invisible.
    const shape = arrow?.querySelector('svg path')
    expect(shape).toBeInTheDocument()
    expect(arrow?.querySelector('svg')).toHaveClass('fill-(--intent-bg-raised)')
  })

  it('Enter activates the strong primary action', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()

    render(
      <Popover>
        <Popover.Trigger>Open</Popover.Trigger>
        <Popover.Content>
          <Popover.Body>Confirm this?</Popover.Body>
          <Popover.Footer>
            <Popover.Close render={<button>Cancel</button>} />
            <button className='emphasis-strong' onClick={onConfirm}>
              Confirm
            </button>
          </Popover.Footer>
        </Popover.Content>
      </Popover>
    )

    await user.click(screen.getByText('Open'))
    const popup = document.querySelector('[data-slot="popover-popup"]')!
    fireEvent.keyDown(popup, { key: 'Enter' })
    expect(onConfirm).toHaveBeenCalledOnce()
  })
})
