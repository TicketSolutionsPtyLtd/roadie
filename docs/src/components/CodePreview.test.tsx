import { type ReactNode, useEffect } from 'react'

// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Toast } from '@oztix/roadie-components/toast'

import { CodePreview } from './CodePreview'
import type { LiveRunnerProps } from './LiveRunner'
import type { Device } from './exampleDevices'

const runner = vi.hoisted(() => ({
  loads: 0,
  failFirst: 0,
  props: undefined as LiveRunnerProps | undefined,
  holdMount: false
}))

const screenDevice = vi.hoisted(() => ({
  current: 'desktop' as Device | undefined
}))

vi.mock('./exampleDevices', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./exampleDevices')>()),
  useViewportDevice: () => screenDevice.current
}))

vi.mock('./LiveRunner', () => {
  runner.loads++
  if (runner.loads <= runner.failFirst) throw new Error('Failed to load chunk')
  return {
    default: function Runner(props: LiveRunnerProps) {
      runner.props = props
      const { onMounted } = props
      useEffect(() => {
        if (!runner.holdMount) onMounted?.()
      }, [onMounted])
      return <p>Example rendered</p>
    }
  }
})

afterEach(() => {
  cleanup()
  runner.failFirst = 0
  runner.props = undefined
  runner.holdMount = false
  screenDevice.current = 'desktop'
  Object.defineProperty(navigator, 'clipboard', {
    value: undefined,
    configurable: true
  })
})

function WithToasts({ children }: { children: ReactNode }) {
  return (
    <Toast.Provider>
      {children}
      <Toast.Viewport />
    </Toast.Provider>
  )
}

const renderWithToasts = (ui: ReactNode) => render(ui, { wrapper: WithToasts })

function setClipboard(writeText: () => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn(writeText) },
    configurable: true
  })
  return navigator.clipboard.writeText
}

function Page() {
  return (
    <main>
      <h1>Number field</h1>
      <CodePreview language='tsx-live' eager>
        {'<NumberField />'}
      </CodePreview>
      <p>Accessibility notes</p>
    </main>
  )
}

describe('CodePreview', () => {
  it('shows an error state when the live runner fails to load, and keeps the page', async () => {
    runner.failFirst = 1
    renderWithToasts(<Page />)

    await screen.findByText("We couldn't load this example")
    screen.getByRole('heading', { name: 'Number field' })
    screen.getByText('Accessibility notes')
    expect(document.body.textContent).toContain('<NumberField />')
  })

  it('loads the example again on Try again, and the examples after it', async () => {
    runner.failFirst = 1
    renderWithToasts(<Page />)

    const retry = await screen.findByRole('button', { name: 'Try again' })
    act(() => fireEvent.click(retry))

    await screen.findByText('Example rendered')
    expect(screen.queryByText("We couldn't load this example")).toBeNull()

    renderWithToasts(<Page />)
    expect(await screen.findAllByText('Example rendered')).toHaveLength(2)
    expect(screen.queryByText("We couldn't load this example")).toBeNull()
  })

  it('puts the preview width and Open in new tab in a header above the preview', async () => {
    renderWithToasts(
      <CodePreview
        language='tsx-live'
        exampleHref='/examples/components/badge/default/'
        eager
      >
        {'<Badge>New</Badge>'}
      </CodePreview>
    )
    const preview = await screen.findByText('Example rendered')

    const widths = screen.getByRole('group', { name: 'Preview width' })
    const link = screen.getByRole('link', { name: 'Open example in a new tab' })
    expect(link.getAttribute('href')).toBe(
      '/examples/components/badge/default/'
    )
    expect(link.getAttribute('target')).toBe('_blank')
    for (const control of [widths, link])
      expect(
        control.compareDocumentPosition(preview) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy()
    expect(
      screen
        .getByRole('button', { name: 'Desktop' })
        .getAttribute('aria-pressed')
    ).toBe('true')
    expect(runner.props?.frameDevice).toBeUndefined()
  })

  it('previews the example at the width picked', async () => {
    renderWithToasts(
      <CodePreview language='tsx-live' eager>
        {'<Badge>New</Badge>'}
      </CodePreview>
    )
    await screen.findByText('Example rendered')

    act(() => fireEvent.click(screen.getByRole('button', { name: 'Phone' })))

    expect(runner.props?.frameDevice).toBe('phone')
    expect(
      screen.getByRole('button', { name: 'Phone' }).getAttribute('aria-pressed')
    ).toBe('true')

    act(() => fireEvent.click(screen.getByRole('button', { name: 'Desktop' })))

    expect(runner.props?.frameDevice).toBeUndefined()
  })

  it('starts on the device the screen matches, and frames a wider one at its own width', async () => {
    screenDevice.current = 'phone'
    renderWithToasts(
      <CodePreview language='tsx-live' eager>
        {'<Badge>New</Badge>'}
      </CodePreview>
    )
    await screen.findByText('Example rendered')

    expect(
      screen.getByRole('button', { name: 'Phone' }).getAttribute('aria-pressed')
    ).toBe('true')
    expect(runner.props?.frameDevice).toBeUndefined()

    act(() => fireEvent.click(screen.getByRole('button', { name: 'Desktop' })))

    expect(runner.props?.frameDevice).toBe('desktop')
  })

  it('presses no width until it knows the screen, so hydration has nothing to flip', async () => {
    screenDevice.current = undefined
    renderWithToasts(
      <CodePreview language='tsx-live' eager>
        {'<Badge>New</Badge>'}
      </CodePreview>
    )
    await screen.findByText('Example rendered')

    for (const name of ['Phone', 'Tablet', 'Desktop'])
      expect(
        screen.getByRole('button', { name }).getAttribute('aria-pressed')
      ).toBe('false')
    expect(runner.props?.frameDevice).toBeUndefined()
  })

  it('opens the full-width view from the header of an expandable example', async () => {
    renderWithToasts(
      <CodePreview language='tsx-live-expand' eager>
        {'<Badge>New</Badge>'}
      </CodePreview>
    )
    await screen.findByText('Example rendered')
    expect(runner.props?.fullWidth).toBe(false)

    act(() =>
      fireEvent.click(screen.getByRole('button', { name: 'Full width' }))
    )

    expect(runner.props?.fullWidth).toBe(true)
  })

  it('keeps Full width off until the example renders', async () => {
    runner.holdMount = true
    renderWithToasts(
      <CodePreview language='tsx-live-expand' eager>
        {'<Badge>New</Badge>'}
      </CodePreview>
    )
    await screen.findByText('Example rendered')

    act(() =>
      fireEvent.click(screen.getByRole('button', { name: 'Full width' }))
    )

    expect(runner.props?.fullWidth).toBe(false)
  })

  it('copies the code, swaps the icon for a tick, and confirms in a toast', async () => {
    const writeText = setClipboard(() => Promise.resolve())
    renderWithToasts(<CodePreview>{'pnpm add @oztix/roadie-core'}</CodePreview>)
    const button = screen.getByRole('button', { name: 'Copy code' })
    const icon = button.innerHTML

    await act(async () => fireEvent.click(button))

    expect(writeText).toHaveBeenCalledWith('pnpm add @oztix/roadie-core')
    expect(button.innerHTML).not.toBe(icon)
    await screen.findByText('Code copied')
  })

  it('says how to copy by hand when the clipboard refuses', async () => {
    setClipboard(() => Promise.reject(new Error('Denied')))
    renderWithToasts(<CodePreview>{'pnpm add @oztix/roadie-core'}</CodePreview>)
    const button = screen.getByRole('button', { name: 'Copy code' })
    const icon = button.innerHTML

    await act(async () => fireEvent.click(button))

    await screen.findByText('Couldn’t copy the code')
    screen.getByText('Select the code and copy it yourself.')
    expect(button.innerHTML).toBe(icon)
  })
})
