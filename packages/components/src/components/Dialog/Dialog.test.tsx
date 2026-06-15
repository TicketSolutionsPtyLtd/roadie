import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Dialog } from '.'
import { DialogBody } from './DialogBody'
import { DialogFooter } from './DialogFooter'
import { DialogHeader } from './DialogHeader'
import { DialogPopup } from './DialogPopup'

// Base UI's Popup requires its Root's React context, so it cannot mount bare.
// Wrap it in an open Root + Portal + Viewport; the popup is portaled into
// document.body, so query there rather than the render container.
function renderPopup(ui: React.ReactElement) {
  render(
    <DialogPrimitive.Root open>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Viewport>{ui}</DialogPrimitive.Viewport>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
  return document.body.querySelector('[data-slot="dialog-popup"]')!
}

describe('DialogPopup', () => {
  it('renders with base surface classes and default md size', () => {
    const popup = renderPopup(<DialogPopup>Body</DialogPopup>)
    expect(popup).toBeInTheDocument()
    expect(popup).toHaveClass('rounded-2xl', 'emphasis-floating')
    expect(popup).toHaveClass('max-w-md') // md default
  })

  it('applies the sm size class', () => {
    const popup = renderPopup(<DialogPopup size='sm'>Body</DialogPopup>)
    expect(popup).toHaveClass('max-w-sm')
  })

  it('applies the intent class when intent is set', () => {
    const popup = renderPopup(<DialogPopup intent='danger'>Body</DialogPopup>)
    expect(popup).toHaveClass('intent-danger')
  })
})

describe('Dialog presentational leaves', () => {
  it('Header renders a grid container', () => {
    const { container } = render(<DialogHeader>Title</DialogHeader>)
    expect(container.querySelector('[data-slot="dialog-header"]')).toHaveClass(
      'grid'
    )
  })

  it('Body renders its content', () => {
    const { getByText } = render(<DialogBody>Content</DialogBody>)
    expect(getByText('Content')).toBeInTheDocument()
  })

  it('Footer renders a centered flex actions row', () => {
    const { container } = render(<DialogFooter>Actions</DialogFooter>)
    expect(container.querySelector('[data-slot="dialog-footer"]')).toHaveClass(
      'flex',
      'justify-center'
    )
  })
})

describe('Dialog (assembled)', () => {
  it('Dialog and Dialog.Root are the same reference', () => {
    expect(Dialog).toBe(Dialog.Root)
  })

  it('opens on trigger, runs confirm action, and closes via Close', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()

    render(
      <Dialog>
        <Dialog.Trigger>Delete</Dialog.Trigger>
        <Dialog.Content intent='danger' size='sm'>
          <Dialog.Header>
            <Dialog.Title>Delete item?</Dialog.Title>
            <Dialog.Description>This cannot be undone.</Dialog.Description>
          </Dialog.Header>
          <Dialog.Footer>
            <Dialog.Close>Cancel</Dialog.Close>
            <button onClick={onConfirm}>Confirm</button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    )

    expect(screen.queryByText('Delete item?')).not.toBeInTheDocument()

    await user.click(screen.getByText('Delete'))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Delete item?')).toBeInTheDocument()

    await user.click(screen.getByText('Confirm'))
    expect(onConfirm).toHaveBeenCalledOnce()

    await user.click(screen.getByText('Cancel'))
    await waitFor(() =>
      expect(screen.queryByText('Delete item?')).not.toBeInTheDocument()
    )
  })

  it('Enter activates the strong primary action', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(
      <Dialog>
        <Dialog.Trigger>Open</Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Save changes?</Dialog.Title>
          </Dialog.Header>
          <Dialog.Footer>
            <Dialog.Close render={<button>Cancel</button>} />
            <button className='emphasis-strong' onClick={onSave}>
              Save
            </button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    )

    await user.click(screen.getByText('Open'))
    const dialog = await screen.findByRole('dialog')

    // Enter from a non-button element fires the strong primary action.
    fireEvent.keyDown(dialog, { key: 'Enter' })
    expect(onSave).toHaveBeenCalledOnce()
  })

  it('Enter does not hijack a focused button or a textarea', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(
      <Dialog>
        <Dialog.Trigger>Open</Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Notes</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <textarea aria-label='Comment' />
            <button>Other action</button>
          </Dialog.Body>
          <Dialog.Footer>
            <button className='emphasis-strong' onClick={onSave}>
              Save
            </button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    )

    await user.click(screen.getByText('Open'))
    await screen.findByRole('dialog')

    // Enter inside a textarea inserts a newline rather than submitting.
    fireEvent.keyDown(screen.getByLabelText('Comment'), { key: 'Enter' })
    expect(onSave).not.toHaveBeenCalled()

    // Enter on a focused non-primary button activates that button itself,
    // not the strong primary action.
    fireEvent.keyDown(screen.getByText('Other action'), { key: 'Enter' })
    expect(onSave).not.toHaveBeenCalled()
  })

  it('does not activate an aria-disabled strong primary action', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(
      <Dialog>
        <Dialog.Trigger>Open</Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Save changes?</Dialog.Title>
          </Dialog.Header>
          <Dialog.Footer>
            {/* A link-style primary action that signals disabled via ARIA
                rather than the native attribute. */}
            <a className='emphasis-strong' aria-disabled='true' onClick={onSave}>
              Save
            </a>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    )

    await user.click(screen.getByText('Open'))
    const dialog = await screen.findByRole('dialog')

    fireEvent.keyDown(dialog, { key: 'Enter' })
    expect(onSave).not.toHaveBeenCalled()
  })

  it('ignores a strong-emphasis non-button (e.g. an IconTile in the header)', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(
      <Dialog>
        <Dialog.Trigger>Open</Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Header>
            {/* A decorative strong-emphasis tile sits before the footer in
                DOM order — it must not be mistaken for the primary action. */}
            <div className='emphasis-strong' data-slot='icon-tile' />
            <Dialog.Title>Save changes?</Dialog.Title>
          </Dialog.Header>
          <Dialog.Footer>
            <button className='emphasis-strong' onClick={onSave}>
              Save
            </button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    )

    await user.click(screen.getByText('Open'))
    const dialog = await screen.findByRole('dialog')

    fireEvent.keyDown(dialog, { key: 'Enter' })
    expect(onSave).toHaveBeenCalledOnce()
  })
})
