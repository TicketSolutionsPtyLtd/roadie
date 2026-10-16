import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Toolbar } from '.'
import { Button, IconButton } from '../Button'
import { Menu } from '../Menu'
import { Toggle } from '../Toggle'
import { ToggleGroup } from '../ToggleGroup'

function Formatting(props: { orientation?: 'horizontal' | 'vertical' }) {
  return (
    <>
      <button type='button'>Before</button>
      <Toolbar aria-label='Formatting' {...props}>
        <Toolbar.Button render={<Toggle aria-label='Bold' />} />
        <Toolbar.Button>Undo</Toolbar.Button>
        <Toolbar.Separator />
        <Toolbar.Link href='/help'>Help</Toolbar.Link>
      </Toolbar>
      <button type='button'>After</button>
    </>
  )
}

describe('Toolbar', () => {
  it('is the same reference as Toolbar.Root', () => {
    expect(Toolbar).toBe(Toolbar.Root)
  })

  it('names a horizontal toolbar by default', () => {
    render(<Formatting />)
    const toolbar = screen.getByRole('toolbar', { name: 'Formatting' })
    expect(toolbar).toHaveAttribute('data-slot', 'toolbar')
    expect(toolbar).toHaveAttribute('aria-orientation', 'horizontal')
  })

  it('reports a vertical orientation', () => {
    render(<Formatting orientation='vertical' />)
    expect(screen.getByRole('toolbar')).toHaveAttribute(
      'aria-orientation',
      'vertical'
    )
  })

  it('takes one Tab stop, with arrows moving across buttons, toggles and links', async () => {
    const user = userEvent.setup()
    render(<Formatting />)
    const bold = screen.getByRole('button', { name: 'Bold' })
    const undo = screen.getByRole('button', { name: 'Undo' })
    const help = screen.getByRole('link', { name: 'Help' })

    screen.getByRole('button', { name: 'Before' }).focus()
    await user.tab()
    expect(bold).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(undo).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(help).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(undo).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus()
  })

  it('moves with up and down arrows when vertical', async () => {
    const user = userEvent.setup()
    render(<Formatting orientation='vertical' />)
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('link', { name: 'Help' })).toHaveFocus()
  })

  it('wraps focus from the last item to the first unless loopFocus is off', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<Formatting />)
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    await user.keyboard('{ArrowRight}{ArrowRight}')
    expect(screen.getByRole('button', { name: 'Bold' })).toHaveFocus()

    rerender(
      <Toolbar aria-label='Formatting' loopFocus={false}>
        <Toolbar.Button>Undo</Toolbar.Button>
        <Toolbar.Button>Redo</Toolbar.Button>
      </Toolbar>
    )
    await user.click(screen.getByRole('button', { name: 'Redo' }))
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: 'Redo' })).toHaveFocus()
  })

  it('presses a Toggle rendered through Toolbar.Button', async () => {
    const user = userEvent.setup()
    render(<Formatting />)
    const bold = screen.getByRole('button', { name: 'Bold' })
    expect(bold).toHaveAttribute('aria-pressed', 'false')
    await user.click(bold)
    expect(bold).toHaveAttribute('aria-pressed', 'true')
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: 'Undo' })).toHaveFocus()
  })

  it('moves through a ToggleGroup in the same arrow order', async () => {
    const user = userEvent.setup()
    render(
      <>
        <Toolbar aria-label='Formatting'>
          <Toolbar.Button>Undo</Toolbar.Button>
          <ToggleGroup aria-label='Alignment' defaultValue={['left']}>
            <ToggleGroup.Item value='left'>Left</ToggleGroup.Item>
            <ToggleGroup.Item value='right'>Right</ToggleGroup.Item>
          </ToggleGroup>
          <Toolbar.Button>Insert</Toolbar.Button>
        </Toolbar>
        <button type='button'>After</button>
      </>
    )
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: 'Left' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: 'Right' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: 'Insert' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus()
  })

  it('keeps a disabled button focusable in the arrow order', async () => {
    const user = userEvent.setup()
    render(
      <Toolbar aria-label='History'>
        <Toolbar.Button>Undo</Toolbar.Button>
        <Toolbar.Button disabled>Redo</Toolbar.Button>
      </Toolbar>
    )
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    await user.keyboard('{ArrowRight}')
    const redo = screen.getByRole('button', { name: 'Redo' })
    expect(redo).toHaveFocus()
    expect(redo).toHaveAttribute('aria-disabled', 'true')
  })

  it('disables every button when the toolbar is disabled', () => {
    render(
      <Toolbar aria-label='History' disabled>
        <Toolbar.Button>Undo</Toolbar.Button>
      </Toolbar>
    )
    expect(screen.getByRole('button', { name: 'Undo' })).toHaveAttribute(
      'aria-disabled',
      'true'
    )
  })

  it('disables the buttons in a disabled group only', () => {
    render(
      <Toolbar aria-label='Editing'>
        <Toolbar.Group aria-label='History' disabled>
          <Toolbar.Button>Undo</Toolbar.Button>
        </Toolbar.Group>
        <Toolbar.Button>Bold</Toolbar.Button>
      </Toolbar>
    )
    expect(screen.getByRole('group', { name: 'History' })).toHaveAttribute(
      'data-slot',
      'toolbar-group'
    )
    expect(screen.getByRole('button', { name: 'Undo' })).toHaveAttribute(
      'aria-disabled',
      'true'
    )
    expect(screen.getByRole('button', { name: 'Bold' })).not.toHaveAttribute(
      'aria-disabled',
      'true'
    )
  })

  it('sits in a normal surface by default', () => {
    render(<Formatting />)
    expect(screen.getByRole('toolbar')).toHaveClass('emphasis-normal')
  })

  it.each(['subtle', 'raised', 'floating'] as const)(
    'takes the %s surface',
    (emphasis) => {
      render(<Toolbar aria-label='Formatting' emphasis={emphasis} />)
      expect(screen.getByRole('toolbar')).toHaveClass(`emphasis-${emphasis}`)
    }
  )

  it('has no surface at emphasis subtler', () => {
    render(<Toolbar aria-label='Formatting' emphasis='subtler' />)
    expect(screen.getByRole('toolbar').className).not.toMatch(/emphasis-/)
  })

  it('renders its parts as Roadie buttons at emphasis subtler', () => {
    render(
      <Toolbar aria-label='Editing'>
        <Toolbar.Button>Undo</Toolbar.Button>
        <Toolbar.Link href='/help'>Help</Toolbar.Link>
      </Toolbar>
    )
    const undo = screen.getByRole('button', { name: 'Undo' })
    const help = screen.getByRole('link', { name: 'Help' })
    expect(undo).toHaveAttribute('data-slot', 'toolbar-button')
    expect(undo).toHaveClass('is-interactive', 'emphasis-subtler')
    expect(help).toHaveAttribute('data-slot', 'toolbar-link')
    expect(help).toHaveClass('is-interactive', 'emphasis-subtler')
  })

  it('lets a render element keep its own props', () => {
    render(
      <Toolbar aria-label='Editing' size='sm'>
        <Toolbar.Button
          render={<IconButton aria-label='Undo' emphasis='strong' />}
        />
      </Toolbar>
    )
    expect(screen.getByRole('button', { name: 'Undo' })).toHaveClass(
      'emphasis-strong'
    )
  })

  it('lets a link render element keep its own props', () => {
    render(
      <Toolbar aria-label='Editing'>
        <Toolbar.Link href='/help' render={<Button emphasis='strong' />}>
          Help
        </Toolbar.Link>
      </Toolbar>
    )
    expect(screen.getByRole('link', { name: 'Help' })).toHaveClass(
      'emphasis-strong'
    )
  })

  it('opens external links in a new tab', () => {
    render(
      <Toolbar aria-label='Editing'>
        <Toolbar.Link href='https://example.com/guide'>Guide</Toolbar.Link>
      </Toolbar>
    )
    expect(screen.getByRole('link', { name: 'Guide' })).toHaveAttribute(
      'target',
      '_blank'
    )
  })

  it('opens an internal link in a new tab when external', () => {
    render(
      <Toolbar aria-label='Editing'>
        <Toolbar.Link href='/events/preview' external>
          Preview
        </Toolbar.Link>
      </Toolbar>
    )
    expect(screen.getByRole('link', { name: 'Preview' })).toHaveAttribute(
      'target',
      '_blank'
    )
  })

  it('opens a menu from a Toolbar.Button trigger in the arrow order', async () => {
    const user = userEvent.setup()
    render(
      <Toolbar aria-label='Editing'>
        <Toolbar.Button>Undo</Toolbar.Button>
        <Menu>
          <Menu.Trigger render={<Toolbar.Button>Insert</Toolbar.Button>} />
          <Menu.Content>
            <Menu.Item>Image</Menu.Item>
          </Menu.Content>
        </Menu>
      </Toolbar>
    )
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    await user.keyboard('{ArrowRight}')
    const insert = screen.getByRole('button', { name: 'Insert' })
    expect(insert).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(
      await screen.findByRole('menuitem', { name: 'Image' })
    ).toBeInTheDocument()
  })

  it('announces a menu trigger in a disabled toolbar as disabled', () => {
    render(
      <Toolbar aria-label='Editing' disabled>
        <Menu>
          <Menu.Trigger render={<Toolbar.Button>Insert</Toolbar.Button>} />
          <Menu.Content>
            <Menu.Item>Image</Menu.Item>
          </Menu.Content>
        </Menu>
      </Toolbar>
    )
    expect(screen.getByRole('button', { name: 'Insert' })).toHaveAttribute(
      'aria-disabled',
      'true'
    )
  })

  it('runs separators across the toolbar', () => {
    const { rerender } = render(
      <Toolbar aria-label='Editing'>
        <Toolbar.Separator />
      </Toolbar>
    )
    const separator = screen.getByRole('separator')
    expect(separator).toHaveAttribute('data-slot', 'toolbar-separator')
    expect(separator).toHaveAttribute('aria-orientation', 'vertical')

    rerender(
      <Toolbar aria-label='Editing' orientation='vertical'>
        <Toolbar.Separator />
      </Toolbar>
    )
    expect(screen.getByRole('separator')).toHaveAttribute(
      'aria-orientation',
      'horizontal'
    )
  })
})
