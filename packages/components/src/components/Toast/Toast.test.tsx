import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import {
  Toast,
  type ToastAddOptions,
  createToastManager,
  useToastManager
} from '.'

const toastEl = () => document.querySelector('[data-slot="toast"]')

function Trigger({ options }: { options: ToastAddOptions }) {
  const toast = useToastManager()
  return (
    <button type='button' onClick={() => toast.add(options)}>
      Show
    </button>
  )
}

async function show(options: ToastAddOptions) {
  const user = userEvent.setup()
  render(
    <Toast.Provider>
      <Trigger options={options} />
      <Toast.Viewport />
    </Toast.Provider>
  )
  await user.click(screen.getByRole('button', { name: 'Show' }))
  return user
}

describe('Toast', () => {
  it('is the same reference as Toast.Root', () => {
    expect(Toast).toBe(Toast.Root)
  })

  it('renders an added toast as a floating card in the toast tier', async () => {
    await show({ title: 'Link copied', description: 'Paste it anywhere.' })

    expect(await screen.findByText('Link copied')).toHaveAttribute(
      'data-slot',
      'toast-title'
    )
    expect(screen.getByText('Paste it anywhere.')).toHaveAttribute(
      'data-slot',
      'toast-description'
    )
    expect(toastEl()).toHaveClass(
      'emphasis-floating',
      'rounded-xl',
      'motion-toast'
    )
    expect(document.querySelector('[data-slot="toast-viewport"]')).toHaveClass(
      'z-toast'
    )
  })

  it('stays neutral with no icon by default', async () => {
    await show({ title: 'Link copied' })
    await screen.findByText('Link copied')
    expect(toastEl()?.className).not.toMatch(/(^| )intent-/)
    expect(
      document.querySelector('[data-slot="toast-icon"]')
    ).not.toBeInTheDocument()
  })

  it.each([
    ['success', 'intent-success'],
    ['danger', 'intent-danger'],
    ['warning', 'intent-warning'],
    ['info', 'intent-info']
  ] as const)(
    'colours a %s toast and leads with an icon',
    async (intent, cls) => {
      await show({ title: 'Heads up', intent })
      await screen.findByText('Heads up')
      expect(toastEl()).toHaveClass(cls)
      expect(toastEl()).toHaveAttribute('data-type', intent)
      expect(
        document.querySelector('[data-slot="toast-icon"] svg')
      ).toBeInTheDocument()
    }
  )

  it('renders an action button that runs its handler', async () => {
    const onClick = vi.fn()
    const user = await show({
      title: 'Event saved',
      actionProps: { children: 'Undo', onClick }
    })
    const undo = await screen.findByRole('button', { name: 'Undo' })
    expect(undo).toHaveAttribute('data-slot', 'toast-action')
    expect(undo).toHaveClass('btn', 'btn-sm')
    await user.click(undo)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('omits the action when there is none', async () => {
    await show({ title: 'Link copied' })
    await screen.findByText('Link copied')
    expect(
      document.querySelector('[data-slot="toast-action"]')
    ).not.toBeInTheDocument()
  })

  it('closes from its dismiss button', async () => {
    const user = await show({ title: 'Link copied', timeout: 0 })
    await screen.findByText('Link copied')
    const close = document.querySelector('[data-slot="toast-close"]')
    expect(close).toHaveAttribute('aria-label', 'Dismiss')
    expect(close).toHaveClass('btn-icon-sm')
    await user.click(close as HTMLElement)
    await waitFor(() =>
      expect(screen.queryByText('Link copied')).not.toBeInTheDocument()
    )
  })

  it('moves a promise toast from loading to success', async () => {
    let resolve: (value: string) => void = () => {}
    const task = new Promise<string>((r) => {
      resolve = r
    })
    function Publisher() {
      const toast = useToastManager()
      return (
        <button
          type='button'
          onClick={() =>
            toast.promise(task, {
              loading: 'Publishing Harbourlight Sessions',
              success: (name) => `${name} is live`,
              error: 'Could not publish'
            })
          }
        >
          Publish
        </button>
      )
    }
    const user = userEvent.setup()
    render(
      <Toast.Provider>
        <Publisher />
        <Toast.Viewport />
      </Toast.Provider>
    )
    await user.click(screen.getByRole('button', { name: 'Publish' }))
    await screen.findByText('Publishing Harbourlight Sessions')
    expect(document.querySelector('[data-slot="toast-icon"] svg')).toHaveClass(
      'animate-spin'
    )

    await act(async () => resolve('Harbourlight Sessions'))
    expect(
      await screen.findByText('Harbourlight Sessions is live')
    ).toBeInTheDocument()
    expect(toastEl()).toHaveClass('intent-success')
  })

  it('paints a failed promise as danger', async () => {
    const manager = createToastManager()
    render(
      <Toast.Provider toastManager={manager}>
        <Toast.Viewport />
      </Toast.Provider>
    )
    await act(async () => {
      await manager
        .promise(Promise.reject(new Error('offline')), {
          loading: 'Publishing',
          success: 'Published',
          error: 'Could not publish'
        })
        .catch(() => {})
    })
    await screen.findByText('Could not publish')
    expect(toastEl()).toHaveClass('intent-danger')
    expect(toastEl()).toHaveAttribute('data-type', 'error')
  })

  it('takes toasts from a manager created outside React', async () => {
    const manager = createToastManager()
    render(
      <Toast.Provider toastManager={manager}>
        <Toast.Viewport />
      </Toast.Provider>
    )
    act(() => {
      manager.add({ title: 'Session expiring', intent: 'warning' })
    })
    await screen.findByText('Session expiring')
    expect(toastEl()).toHaveClass('intent-warning')
  })

  it('updates the intent of an existing toast', async () => {
    const manager = createToastManager()
    render(
      <Toast.Provider toastManager={manager}>
        <Toast.Viewport />
      </Toast.Provider>
    )
    let id = ''
    act(() => {
      id = manager.add({ title: 'Saving', timeout: 0 })
    })
    await screen.findByText('Saving')
    act(() => {
      manager.update(id, { title: 'Saved', intent: 'success' })
    })
    await screen.findByText('Saved')
    expect(toastEl()).toHaveClass('intent-success')
  })

  it('lets you compose the toast yourself', async () => {
    function Custom() {
      const { toasts } = useToastManager()
      return toasts.map((toast) => (
        <Toast key={toast.id} toast={toast}>
          <Toast.Content>
            <Toast.Title />
            <Toast.Close aria-label='Close notification' />
          </Toast.Content>
        </Toast>
      ))
    }
    const manager = createToastManager()
    render(
      <Toast.Provider toastManager={manager}>
        <Toast.Viewport>
          <Custom />
        </Toast.Viewport>
      </Toast.Provider>
    )
    act(() => {
      manager.add({ title: 'Custom', timeout: 0 })
    })
    await screen.findByText('Custom')
    expect(document.querySelector('[data-slot="toast-close"]')).toHaveAttribute(
      'aria-label',
      'Close notification'
    )
    expect(
      document.querySelector('[data-slot="toast-content"]')
    ).toBeInTheDocument()
  })

  it('keeps the close label on a custom render element', async () => {
    function Custom() {
      const { toasts } = useToastManager()
      return toasts.map((toast) => (
        <Toast key={toast.id} toast={toast}>
          <Toast.Close render={<button type='button' />} aria-label='Hide'>
            x
          </Toast.Close>
        </Toast>
      ))
    }
    const manager = createToastManager()
    render(
      <Toast.Provider toastManager={manager}>
        <Toast.Viewport>
          <Custom />
        </Toast.Viewport>
      </Toast.Provider>
    )
    act(() => {
      manager.add({ title: 'Custom', timeout: 0 })
    })
    expect(await screen.findByText('x')).toHaveAttribute('aria-label', 'Hide')
  })

  it('takes intent in place of type', () => {
    const manager = createToastManager()
    // @ts-expect-error `type` is replaced by `intent`
    manager.add({ title: 'Typed', type: 'success' })
    // @ts-expect-error `type` is replaced by `intent`
    manager.update('id', { type: 'success' })
  })
})
