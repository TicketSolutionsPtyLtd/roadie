import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Drawer } from '.'
import { List } from '../List'

const slot = (name: string) =>
  document.body.querySelector<HTMLElement>(`[data-slot="drawer-${name}"]`)

function renderOpen(props: Partial<React.ComponentProps<typeof Drawer>> = {}) {
  return render(
    <Drawer defaultOpen {...props}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>Filters</Drawer.Title>
          <Drawer.Description>Narrow the results</Drawer.Description>
        </Drawer.Header>
        <Drawer.Body>Body</Drawer.Body>
        <Drawer.Footer>
          <Drawer.Close>Done</Drawer.Close>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}

describe('Drawer compound shape', () => {
  it('exposes the root as both the bare form and the .Root alias', () => {
    expect(Drawer).toBe(Drawer.Root)
  })
})

describe('Drawer.Content', () => {
  it('renders the portal parts and labels the dialog with the title', async () => {
    renderOpen()
    const popup = await screen.findByRole('dialog')
    expect(popup).toBe(slot('popup'))
    expect(slot('backdrop')).toBeInTheDocument()
    expect(slot('viewport')).toBeInTheDocument()
    expect(popup).toHaveAccessibleName('Filters')
    expect(popup).toHaveAccessibleDescription('Narrow the results')
  })

  it('titles with the shared surface title class', async () => {
    renderOpen()
    await screen.findByRole('dialog')
    expect(slot('title')).toHaveClass('text-display-ui-4')
  })

  it('renders nothing when closed', () => {
    render(
      <Drawer>
        <Drawer.Content>
          <Drawer.Title>Filters</Drawer.Title>
        </Drawer.Content>
      </Drawer>
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('marks the body as drawer content so a drag there scrolls', async () => {
    renderOpen()
    await screen.findByRole('dialog')
    expect(slot('body')).toHaveAttribute('data-drawer-content')
  })

  it("scrolls in Roadie's scroll area, the body itself the viewport", async () => {
    renderOpen()
    await screen.findByRole('dialog')
    expect(slot('body')).toHaveAttribute('data-slot', 'drawer-body')
    expect(slot('body')!.parentElement).toHaveAttribute(
      'data-slot',
      'scroll-area'
    )
  })
})

describe('Drawer content inset', () => {
  it('publishes one inset the header and body both resolve against', async () => {
    renderOpen()
    const popup = await screen.findByRole('dialog')
    expect(popup).toHaveClass('[--content-inset:--spacing(6)]')
    expect(slot('header')).toHaveClass('px-(--content-inset)')
    expect(
      slot('body')!.querySelector('[data-slot="scroll-area-content"]')
    ).toHaveClass('px-(--content-inset)')
  })

  it('lands a List in the body on the same edge as the title', async () => {
    render(
      <Drawer defaultOpen>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Filters</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body>
            <List>
              <List.Item title='Music' />
            </List>
          </Drawer.Body>
        </Drawer.Content>
      </Drawer>
    )
    await screen.findByRole('dialog')

    expect(document.querySelector('[data-slot="list-item"]')).toHaveClass(
      'px-3',
      'group-data-[emphasis=subtler]/list:-mx-3'
    )
  })
})

describe('Drawer side', () => {
  it('swipes down and anchors to the bottom edge by default', async () => {
    renderOpen()
    const popup = await screen.findByRole('dialog')
    expect(popup).toHaveAttribute('data-swipe-direction', 'down')
    expect(slot('viewport')).toHaveClass('items-end')
  })

  it.each(['bottom', 'top'] as const)(
    'caps a %s drawer and centres it in a wide window',
    async (side) => {
      renderOpen({ side })
      expect(await screen.findByRole('dialog')).toHaveClass(
        'w-full',
        'max-w-xl'
      )
      expect(slot('viewport')).toHaveClass('justify-items-center')
    }
  )

  it('side="right" swipes right and anchors to the trailing edge', async () => {
    renderOpen({ side: 'right' })
    const popup = await screen.findByRole('dialog')
    expect(popup).toHaveAttribute('data-swipe-direction', 'right')
    expect(slot('viewport')).toHaveClass('justify-items-end')
  })

  it('side="left" swipes left', async () => {
    renderOpen({ side: 'left' })
    expect(await screen.findByRole('dialog')).toHaveAttribute(
      'data-swipe-direction',
      'left'
    )
  })

  it('side="top" swipes up', async () => {
    renderOpen({ side: 'top' })
    expect(await screen.findByRole('dialog')).toHaveAttribute(
      'data-swipe-direction',
      'up'
    )
  })
})

describe('Drawer.Handle', () => {
  it('is present by default on a bottom drawer', async () => {
    renderOpen()
    await screen.findByRole('dialog')
    expect(slot('handle')).toBeInTheDocument()
  })

  it('is absent by default on a side drawer', async () => {
    renderOpen({ side: 'right' })
    await screen.findByRole('dialog')
    expect(slot('handle')).not.toBeInTheDocument()
  })

  it('can be forced on for a side drawer', async () => {
    render(
      <Drawer defaultOpen side='right'>
        <Drawer.Content handle>
          <Drawer.Title>Filters</Drawer.Title>
        </Drawer.Content>
      </Drawer>
    )
    await screen.findByRole('dialog')
    expect(slot('handle')).toBeInTheDocument()
  })

  it('is hidden from assistive tech', async () => {
    renderOpen()
    await screen.findByRole('dialog')
    expect(slot('handle')).toHaveAttribute('aria-hidden', 'true')
  })

  // Sunken sits a step off the raised popup in light mode and reads as missing.
  it('is painted in the divider colour', async () => {
    renderOpen()
    await screen.findByRole('dialog')
    expect(slot('handle')).toHaveClass('bg-(--intent-border-subtle)')
  })
})

describe('Drawer open and close', () => {
  it('opens from the trigger and closes from Drawer.Close', async () => {
    const user = userEvent.setup()
    render(
      <Drawer>
        <Drawer.Trigger>Open</Drawer.Trigger>
        <Drawer.Content>
          <Drawer.Title>Filters</Drawer.Title>
          <Drawer.Footer>
            <Drawer.Close>Done</Drawer.Close>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Done' }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
  })

  it('closes on Escape and reports the reason', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(
      <Drawer defaultOpen onOpenChange={onOpenChange}>
        <Drawer.Content>
          <Drawer.Title>Filters</Drawer.Title>
        </Drawer.Content>
      </Drawer>
    )
    await screen.findByRole('dialog')

    await user.keyboard('{Escape}')
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
    expect(onOpenChange).toHaveBeenCalledWith(
      false,
      expect.objectContaining({ reason: 'escape-key' })
    )
  })

  it('moves focus into the drawer when it opens', async () => {
    const user = userEvent.setup()
    render(
      <Drawer>
        <Drawer.Trigger>Open</Drawer.Trigger>
        <Drawer.Content>
          <Drawer.Title>Filters</Drawer.Title>
          <Drawer.Body>
            <button type='button'>First</button>
          </Drawer.Body>
        </Drawer.Content>
      </Drawer>
    )
    await user.click(screen.getByRole('button', { name: 'Open' }))
    const popup = await screen.findByRole('dialog')
    await waitFor(() =>
      expect(popup).toContainElement(document.activeElement as HTMLElement)
    )
  })
})

describe('Drawer surface', () => {
  it('carries the drawer motion utility rather than a transform-only one', async () => {
    renderOpen()
    expect(await screen.findByRole('dialog')).toHaveClass('motion-drawer')
  })

  it('layers the surface above the scrim', async () => {
    renderOpen()
    await screen.findByRole('dialog')
    expect(slot('viewport')).toHaveClass('z-modal')
    expect(slot('backdrop')).toHaveClass('z-overlay')
  })

  it('hides the page behind a normal scrim by default', async () => {
    renderOpen()
    await screen.findByRole('dialog')
    expect(slot('backdrop')).toHaveClass('emphasis-overlay')
  })

  it.each(['bottom', 'top'] as const)(
    'lets the page show through a small %s drawer',
    async (side) => {
      render(
        <Drawer defaultOpen side={side}>
          <Drawer.Content size='sm'>
            <Drawer.Title>Filters</Drawer.Title>
          </Drawer.Content>
        </Drawer>
      )
      await screen.findByRole('dialog')
      expect(slot('backdrop')).toHaveClass('emphasis-overlay-subtle')
      expect(slot('backdrop')).not.toHaveClass('emphasis-overlay')
    }
  )

  it('keeps the normal scrim on a small side drawer', async () => {
    render(
      <Drawer defaultOpen side='right'>
        <Drawer.Content size='sm'>
          <Drawer.Title>Filters</Drawer.Title>
        </Drawer.Content>
      </Drawer>
    )
    await screen.findByRole('dialog')
    expect(slot('backdrop')).toHaveClass('emphasis-overlay')
  })

  it.each([
    ['normal', 'emphasis-overlay'],
    ['subtle', 'emphasis-overlay-subtle'],
    ['subtler', 'bg-transparent']
  ] as const)('takes a %s emphasis from the root', async (emphasis, cls) => {
    render(
      <Drawer defaultOpen emphasis={emphasis}>
        <Drawer.Content size='sm'>
          <Drawer.Title>Filters</Drawer.Title>
        </Drawer.Content>
      </Drawer>
    )
    await screen.findByRole('dialog')
    expect(slot('backdrop')).toHaveClass(cls)
  })

  it('reaches a hand-composed backdrop', async () => {
    render(
      <Drawer defaultOpen emphasis='subtle'>
        <Drawer.Portal>
          <Drawer.Backdrop />
          <Drawer.Viewport>
            <Drawer.Popup>
              <Drawer.Title>Filters</Drawer.Title>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer>
    )
    await screen.findByRole('dialog')
    expect(slot('backdrop')).toHaveClass('emphasis-overlay-subtle')
  })

  it('lets the page show through a small hand-composed sheet too', async () => {
    render(
      <Drawer defaultOpen>
        <Drawer.Portal>
          <Drawer.Backdrop />
          <Drawer.Viewport>
            <Drawer.Popup size='sm'>
              <Drawer.Title>Filters</Drawer.Title>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer>
    )
    await screen.findByRole('dialog')
    expect(slot('backdrop')).toHaveClass('emphasis-overlay-subtle')
  })

  it('still dismisses on a click outside at subtler', async () => {
    const onOpenChange = vi.fn()
    render(
      <Drawer defaultOpen emphasis='subtler' onOpenChange={onOpenChange}>
        <Drawer.Content>
          <Drawer.Title>Filters</Drawer.Title>
        </Drawer.Content>
      </Drawer>
    )
    await screen.findByRole('dialog')
    await userEvent.click(slot('backdrop')!)
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything())
  })

  it('drops the scrim transition mid-swipe so it tracks the drag', async () => {
    renderOpen()
    await screen.findByRole('dialog')
    expect(slot('backdrop')).toHaveClass('data-[swiping]:duration-0')
  })

  it('applies the intent class when intent is set', async () => {
    render(
      <Drawer defaultOpen>
        <Drawer.Content intent='danger'>
          <Drawer.Title>Filters</Drawer.Title>
        </Drawer.Content>
      </Drawer>
    )
    expect(await screen.findByRole('dialog')).toHaveClass('intent-danger')
  })

  it('fits a bottom drawer to its content, and gives a side one md, by default', async () => {
    const { unmount } = renderOpen({ side: 'bottom' })
    const sheet = await screen.findByRole('dialog')
    expect(sheet).toHaveAttribute('data-size', 'fit')
    expect(sheet).toHaveClass('max-h-(--drawer-tall)')
    unmount()

    renderOpen({ side: 'right' })
    const side = await screen.findByRole('dialog')
    expect(side).toHaveAttribute('data-size', 'md')
    expect(side).toHaveClass('w-full', 'max-w-md')
  })

  it.each([
    ['sm', 'h-[50dvh]'],
    ['md', 'h-[75dvh]'],
    ['lg', 'h-(--drawer-tall)']
  ] as const)(
    'holds a %s bottom drawer at a fixed height',
    async (size, cls) => {
      render(
        <Drawer defaultOpen>
          <Drawer.Content size={size}>
            <Drawer.Title>Filters</Drawer.Title>
          </Drawer.Content>
        </Drawer>
      )
      expect(await screen.findByRole('dialog')).toHaveClass(cls)
    }
  )
})
