import { act, render, screen } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Kbd } from '.'

const SUBTLE_FILL = 'bg-[color-mix(in_oklch,currentColor_10%,transparent)]'

function onPlatform(platform: string) {
  vi.spyOn(navigator, 'platform', 'get').mockReturnValue(platform)
}

afterEach(() => vi.restoreAllMocks())

describe('Kbd', () => {
  it('renders a subtle keycap hidden from assistive tech', () => {
    const { container } = render(<Kbd>/</Kbd>)
    const kbd = container.querySelector('kbd')!
    expect(kbd).toHaveAttribute('data-slot', 'kbd')
    expect(kbd).toHaveAttribute('aria-hidden', 'true')
    expect(kbd).toHaveClass('rounded-md', SUBTLE_FILL, 'text-xs', 'h-6')
    expect(kbd).toHaveTextContent('/')
  })

  it('builds normal on emphasis-normal', () => {
    const { container } = render(<Kbd emphasis='normal'>/</Kbd>)
    const kbd = container.querySelector('kbd')!
    expect(kbd).toHaveClass('rounded-md', 'emphasis-normal', 'h-6')
    expect(kbd).not.toHaveClass(SUBTLE_FILL)
  })

  it('hides itself on screens without hover', () => {
    const { container } = render(<Kbd>/</Kbd>)
    expect(container.firstElementChild).toHaveClass(
      '[@media_not_(hover:hover)]:not-in-data-[keyboard-hints=always]:hidden'
    )
  })

  it('maps a known key name to its glyph and word', () => {
    const { container } = render(<Kbd>Enter</Kbd>)
    expect(container.querySelector('kbd svg')).toBeInTheDocument()
    expect(container.querySelector('kbd')).toHaveTextContent('Enter')
  })

  it('renders other children as they are', () => {
    render(
      <Kbd>
        <span data-testid='custom'>Fn</span>
      </Kbd>
    )
    expect(screen.getByTestId('custom')).toHaveTextContent('Fn')
  })

  it('renders each of keys as its own keycap in a group', () => {
    onPlatform('Win32')
    const { container } = render(<Kbd keys={['mod', 'k']} />)
    const group = container.firstElementChild!
    expect(group.tagName).toBe('KBD')
    expect(group).toHaveAttribute('data-slot', 'kbd-group')
    expect(group).toHaveAttribute('aria-hidden', 'true')
    expect(group).toHaveClass(
      '[@media_not_(hover:hover)]:not-in-data-[keyboard-hints=always]:hidden'
    )
    const caps = group.querySelectorAll('[data-slot="kbd"]')
    expect(Array.from(caps, (cap) => cap.textContent)).toEqual(['Ctrl', 'K'])
    for (const cap of caps) {
      expect(cap.tagName).toBe('KBD')
      expect(cap).not.toHaveAttribute('aria-hidden')
      expect(cap).toHaveClass(SUBTLE_FILL)
    }
  })

  it('shows mod as Command on Apple platforms', () => {
    onPlatform('MacIntel')
    render(<Kbd keys={['mod', 'k']} announce />)
    expect(screen.getByText('Command')).toHaveClass('sr-only')
  })

  it('renders plain text when emphasis is subtler', () => {
    const { container } = render(<Kbd emphasis='subtler'>/</Kbd>)
    const kbd = container.querySelector('kbd')!
    expect(kbd).toHaveClass('tracking-wide')
    expect(kbd).not.toHaveClass(SUBTLE_FILL)
    expect(kbd).not.toHaveClass('emphasis-subtler')
    expect(kbd).not.toHaveClass('h-6')
  })

  it('sizes the keycap', () => {
    const { container } = render(<Kbd size='sm'>/</Kbd>)
    expect(container.querySelector('kbd')).toHaveClass('h-5', 'min-w-5')
  })

  it('passes size to every keycap in a group', () => {
    const { container } = render(<Kbd keys={['shift', 'k']} size='sm' />)
    for (const cap of container.querySelectorAll('[data-slot="kbd"]'))
      expect(cap).toHaveClass('h-5', 'min-w-5')
  })

  it('passes emphasis to every keycap in a group', () => {
    const { container } = render(
      <Kbd keys={['shift', 'k']} emphasis='subtler' />
    )
    for (const cap of container.querySelectorAll('[data-slot="kbd"]'))
      expect(cap).not.toHaveClass(SUBTLE_FILL)
  })

  it('joins plain keys with a hidden plus off Apple platforms', () => {
    onPlatform('Win32')
    const { container } = render(
      <Kbd keys={['mod', 'shift', 'd']} emphasis='subtler' />
    )
    expect(container.firstElementChild).toHaveTextContent('Ctrl+Shift+D')
    for (const plus of container.querySelectorAll('[data-slot="kbd-plus"]'))
      expect(plus).toHaveAttribute('aria-hidden', 'true')
  })

  it('sets the plus in the keys type, hidden until the platform is known', () => {
    const html = renderToString(<Kbd keys={['mod', 'd']} emphasis='subtler' />)
    const holder = document.createElement('div')
    holder.innerHTML = html
    const plus = holder.querySelector('[data-slot="kbd-plus"]')!
    expect(plus).toHaveClass('invisible', 'text-xs')

    onPlatform('Win32')
    const { container } = render(<Kbd keys={['mod', 'd']} emphasis='subtler' />)
    const shown = container.querySelector('[data-slot="kbd-plus"]')!
    expect(shown).toHaveClass('text-xs')
    expect(shown).not.toHaveClass('invisible')
  })

  it('runs plain keys together on Apple platforms', () => {
    onPlatform('MacIntel')
    const { container } = render(<Kbd keys={['mod', 'd']} emphasis='subtler' />)
    expect(container.querySelector('[data-slot="kbd-plus"]')).toBeNull()
  })

  it('keeps announced keys on touch screens, where they are content', () => {
    const { container } = render(<Kbd keys={['mod', 'k']} announce />)
    expect(container.firstElementChild).not.toHaveClass(
      '[@media_not_(hover:hover)]:not-in-data-[keyboard-hints=always]:hidden'
    )
  })

  it('announces each key by name when asked', () => {
    onPlatform('Win32')
    const { container } = render(
      <p>
        Press <Kbd keys={['mod', 'enter']} announce /> to send
      </p>
    )
    const group = container.querySelector('kbd')!
    expect(group).not.toHaveAttribute('aria-hidden')
    expect(screen.getByText('Control')).toHaveClass('sr-only')
    expect(screen.getByText('Enter', { selector: '.sr-only' })).toBeVisible()
    for (const svg of group.querySelectorAll('svg')) {
      expect(svg.closest('[aria-hidden="true"]')).not.toBeNull()
    }
  })

  it('joins keys in one keycap', () => {
    onPlatform('Win32')
    const { container } = render(<Kbd keys={['mod', 'k']} joined />)
    const cap = container.firstElementChild!
    expect(cap.tagName).toBe('KBD')
    expect(cap).toHaveAttribute('data-slot', 'kbd')
    expect(cap).toHaveAttribute('aria-hidden', 'true')
    expect(cap).toHaveClass(
      SUBTLE_FILL,
      'h-6',
      '[@media_not_(hover:hover)]:not-in-data-[keyboard-hints=always]:hidden'
    )
    expect(cap.querySelectorAll('[data-slot="kbd"]')).toHaveLength(0)
    const keys = cap.querySelectorAll('[data-slot="kbd-key"]')
    expect(Array.from(keys, (key) => key.tagName)).toEqual(['KBD', 'KBD'])
    expect(cap).toHaveTextContent('Ctrl+K')
  })

  it('runs joined keys together on Apple platforms', () => {
    onPlatform('MacIntel')
    const { container } = render(
      <Kbd keys={['mod', 'k']} joined emphasis='normal' size='sm' />
    )
    const cap = container.firstElementChild!
    expect(cap).toHaveClass('emphasis-normal', 'h-5')
    expect(cap.querySelector('[data-slot="kbd-plus"]')).toBeNull()
    expect(cap.querySelector('svg')).toBeInTheDocument()
    expect(cap.textContent).toBe('K')
  })

  it('announces joined keys by name', () => {
    onPlatform('MacIntel')
    render(<Kbd keys={['mod', 'k']} joined announce />)
    expect(screen.getByText('Command')).toHaveClass('sr-only')
    expect(screen.getByText('Command').closest('[aria-hidden]')).toBeNull()
  })

  it('keeps subtler keys plain when joined', () => {
    onPlatform('Win32')
    const { container } = render(
      <Kbd keys={['mod', 'k']} joined emphasis='subtler' />
    )
    const group = container.firstElementChild!
    expect(group).toHaveAttribute('data-slot', 'kbd-group')
    expect(group).toHaveTextContent('Ctrl+K')
  })

  it('forwards props to the root', () => {
    const { container } = render(
      <Kbd keys={['k']} className='custom' data-testid='root' />
    )
    expect(container.firstElementChild).toHaveClass('custom')
    expect(screen.getByTestId('root')).toBe(container.firstElementChild)
  })
})

describe('Kbd platform keys across hydration', () => {
  it('hides a joined plus until the platform is known', () => {
    const html = renderToString(<Kbd keys={['mod', 'd']} joined />)
    const holder = document.createElement('div')
    holder.innerHTML = html
    expect(holder.querySelector('[data-slot="kbd-plus"]')).toHaveClass(
      'invisible'
    )
  })

  async function hydrate(platform: string) {
    const element = <Kbd keys={['mod', 'k']} announce />
    const serverHtml = renderToString(element)
    onPlatform(platform)
    const container = document.createElement('div')
    container.innerHTML = serverHtml
    document.body.append(container)
    const recoverable = vi.fn()
    const consoleError = vi.spyOn(console, 'error')
    await act(async () => {
      hydrateRoot(container, element, { onRecoverableError: recoverable })
    })
    return { serverHtml, container, recoverable, consoleError }
  }

  it('renders a placeholder on the server, then Command on a Mac', async () => {
    const { serverHtml, container, recoverable, consoleError } =
      await hydrate('MacIntel')
    expect(serverHtml).toContain('invisible')
    expect(serverHtml).not.toContain('Command')
    expect(recoverable).not.toHaveBeenCalled()
    expect(consoleError).not.toHaveBeenCalled()
    expect(container).toHaveTextContent('Command')
    expect(container.querySelector('.invisible')).toBeNull()
    container.remove()
  })

  it('renders a placeholder on the server, then Ctrl elsewhere', async () => {
    const { container, recoverable, consoleError } = await hydrate('Win32')
    expect(recoverable).not.toHaveBeenCalled()
    expect(consoleError).not.toHaveBeenCalled()
    expect(container).toHaveTextContent('Control')
    expect(container.querySelector('.invisible')).toBeNull()
    container.remove()
  })
})
