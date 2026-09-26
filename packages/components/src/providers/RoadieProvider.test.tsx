import { type ReactNode } from 'react'

import { useDirection } from '@base-ui/react/direction-provider'
import { render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Toast, useToastManager } from '../components/Toast'
import { Tooltip } from '../components/Tooltip'
import {
  type RoadieLinkComponent,
  RoadieLinkProvider,
  useRoadieLink
} from './RoadieLinkProvider'
import { RoadieProvider } from './RoadieProvider'
import { ThemeProvider, useTheme } from './ThemeProvider'

const StubLink: RoadieLinkComponent = ({ href, children, ...rest }) => (
  <a href={href} {...rest}>
    {children}
  </a>
)
const OtherLink: RoadieLinkComponent = (props) => <StubLink {...props} />

const viewports = () =>
  document.querySelectorAll('[data-slot="toast-viewport"]')

function warnings() {
  return vi.spyOn(console, 'warn').mockImplementation(() => {})
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('RoadieProvider', () => {
  it('supplies the link, theme, toasts and direction to its children', () => {
    const { result } = renderHook(
      () => ({
        link: useRoadieLink(),
        theme: useTheme(),
        toasts: useToastManager(),
        direction: useDirection()
      }),
      {
        wrapper: ({ children }) => (
          <RoadieProvider link={StubLink} direction='rtl'>
            {children}
          </RoadieProvider>
        )
      }
    )
    expect(result.current.link).toBe(StubLink)
    expect(typeof result.current.theme.setDark).toBe('function')
    expect(typeof result.current.toasts.add).toBe('function')
    expect(result.current.direction).toBe('rtl')
  })

  it('shows toasts added anywhere below it', async () => {
    function Save() {
      const toasts = useToastManager()
      return (
        <button onClick={() => toasts.add({ title: 'Saved' })}>Save</button>
      )
    }
    render(
      <RoadieProvider>
        <Save />
      </RoadieProvider>
    )
    expect(viewports()).toHaveLength(1)
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Saved')).toBeInTheDocument()
  })

  it('places the viewport where toast options say', () => {
    render(
      <RoadieProvider toast={{ position: 'top-center' }}>
        <p>Paperbark Sessions</p>
      </RoadieProvider>
    )
    expect(viewports()[0]).toHaveAttribute('data-position', 'top-center')
  })

  it('groups tooltips, so a neighbour opens instantly', async () => {
    const user = userEvent.setup()
    render(
      <RoadieProvider tooltip={{ delay: 0 }}>
        <Tooltip>
          <Tooltip.Trigger>One</Tooltip.Trigger>
          <Tooltip.Content>First</Tooltip.Content>
        </Tooltip>
        <Tooltip>
          <Tooltip.Trigger>Two</Tooltip.Trigger>
          <Tooltip.Content>Second</Tooltip.Content>
        </Tooltip>
      </RoadieProvider>
    )
    await user.hover(screen.getByRole('button', { name: 'One' }))
    await screen.findByText('First')
    await user.hover(screen.getByRole('button', { name: 'Two' }))
    expect(await screen.findByText('Second')).toHaveAttribute(
      'data-instant',
      'delay'
    )
  })

  it('keeps direction to an outer provider when not given one', () => {
    const { result } = renderHook(() => useDirection(), {
      wrapper: ({ children }) => <RoadieProvider>{children}</RoadieProvider>
    })
    expect(result.current).toBe('ltr')
  })

  describe('opting out', () => {
    it('mounts no toasts with toast={false}', () => {
      render(
        <RoadieProvider toast={false}>
          <p>Paperbark Sessions</p>
        </RoadieProvider>
      )
      expect(viewports()).toHaveLength(0)
    })

    it('mounts no theme with theme={false}', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      expect(() =>
        renderHook(() => useTheme(), {
          wrapper: ({ children }) => (
            <RoadieProvider theme={false}>{children}</RoadieProvider>
          )
        })
      ).toThrow(/within a ThemeProvider/)
    })

    it('leaves tooltips ungrouped with tooltip={false}', async () => {
      const user = userEvent.setup()
      render(
        <RoadieProvider tooltip={false}>
          <Tooltip>
            <Tooltip.Trigger delay={0}>One</Tooltip.Trigger>
            <Tooltip.Content>First</Tooltip.Content>
          </Tooltip>
          <Tooltip>
            <Tooltip.Trigger delay={0}>Two</Tooltip.Trigger>
            <Tooltip.Content>Second</Tooltip.Content>
          </Tooltip>
        </RoadieProvider>
      )
      await user.hover(screen.getByRole('button', { name: 'One' }))
      await screen.findByText('First')
      await user.hover(screen.getByRole('button', { name: 'Two' }))
      expect(await screen.findByText('Second')).not.toHaveAttribute(
        'data-instant'
      )
    })
  })

  describe('a nested provider', () => {
    it('overrides the link for its subtree', () => {
      const { result } = renderHook(() => useRoadieLink(), {
        wrapper: ({ children }) => (
          <RoadieProvider link={StubLink}>
            <RoadieLinkProvider Link={OtherLink}>{children}</RoadieLinkProvider>
          </RoadieProvider>
        )
      })
      expect(result.current).toBe(OtherLink)
    })

    it('scopes toasts to its own viewport', async () => {
      function Save({ label }: { label: string }) {
        const toasts = useToastManager()
        return (
          <button onClick={() => toasts.add({ title: label })}>{label}</button>
        )
      }
      function Region({ children }: { children: ReactNode }) {
        return (
          <Toast.Provider>
            {children}
            <Toast.Viewport position='top-center' />
          </Toast.Provider>
        )
      }
      const warn = warnings()
      render(
        <RoadieProvider>
          <Region>
            <Save label='Held' />
          </Region>
        </RoadieProvider>
      )
      await userEvent.click(screen.getByRole('button', { name: 'Held' }))
      await waitFor(() =>
        expect(
          document.querySelector(
            '[data-slot="toast-viewport"][data-position="top-center"] [data-slot="toast"]'
          )
        ).not.toBeNull()
      )
      expect(
        document.querySelector(
          '[data-slot="toast-viewport"][data-position="bottom-end"] [data-slot="toast"]'
        )
      ).toBeNull()
      expect(warn).not.toHaveBeenCalled()
    })
  })

  describe('duplicate providers', () => {
    const cases: Array<[string, ReactNode, RegExp]> = [
      [
        'nested inside another RoadieProvider',
        <RoadieProvider key='a'>
          <RoadieProvider>
            <p>Paperbark Sessions</p>
          </RoadieProvider>
        </RoadieProvider>,
        /nested inside another RoadieProvider/
      ],
      [
        'wrapping a ThemeProvider',
        <RoadieProvider key='b'>
          <ThemeProvider>
            <p>Paperbark Sessions</p>
          </ThemeProvider>
        </RoadieProvider>,
        /ThemeProvider directly inside RoadieProvider/
      ],
      [
        'wrapped by a ThemeProvider',
        <ThemeProvider key='c'>
          <RoadieProvider>
            <p>Paperbark Sessions</p>
          </RoadieProvider>
        </ThemeProvider>,
        /RoadieProvider inside a ThemeProvider/
      ],
      [
        'wrapping a Toast.Provider',
        <RoadieProvider key='d'>
          <Toast.Provider>
            <p>Paperbark Sessions</p>
            <Toast.Viewport />
          </Toast.Provider>
        </RoadieProvider>,
        /Toast.Provider directly inside RoadieProvider/
      ],
      [
        'wrapped by a Toast.Provider',
        <Toast.Provider key='e'>
          <RoadieProvider>
            <p>Paperbark Sessions</p>
          </RoadieProvider>
        </Toast.Provider>,
        /RoadieProvider inside a Toast.Provider/
      ]
    ]

    it.each(cases)('warns once in development when %s', (_, tree, message) => {
      const warn = warnings()
      render(tree)
      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn.mock.calls[0]?.[0]).toMatch(message)
    })

    it.each(cases)('stays quiet in production when %s', (_, tree) => {
      vi.stubEnv('NODE_ENV', 'production')
      const warn = warnings()
      render(tree)
      expect(warn).not.toHaveBeenCalled()
    })

    it('stays quiet when the nested one leaves the theme and toasts to the root', () => {
      const warn = warnings()
      render(
        <RoadieProvider>
          <RoadieProvider theme={false} toast={false} direction='rtl'>
            <p>Paperbark Sessions</p>
          </RoadieProvider>
        </RoadieProvider>
      )
      expect(warn).not.toHaveBeenCalled()
    })

    it('stays quiet about a provider scoped deeper, such as a route accent', () => {
      function CollectionLayout({ children }: { children: ReactNode }) {
        return <ThemeProvider accentColor='#7C3AED'>{children}</ThemeProvider>
      }
      const warn = warnings()
      render(
        <RoadieProvider>
          <CollectionLayout>
            <p>Paperbark Sessions</p>
          </CollectionLayout>
        </RoadieProvider>
      )
      expect(warn).not.toHaveBeenCalled()
    })

    it('stays quiet about parts it leaves out', () => {
      const warn = warnings()
      render(
        <ThemeProvider>
          <Toast.Provider>
            <RoadieProvider theme={false} toast={false}>
              <p>Paperbark Sessions</p>
            </RoadieProvider>
          </Toast.Provider>
        </ThemeProvider>
      )
      expect(warn).not.toHaveBeenCalled()
    })
  })

  it('keeps its context values across a re-render with fresh option objects', () => {
    const seen: unknown[] = []
    function Probe() {
      seen.push(useTheme())
      return null
    }
    const { rerender } = render(
      <RoadieProvider theme={{ followSystem: true }}>
        <Probe />
      </RoadieProvider>
    )
    rerender(
      <RoadieProvider theme={{ followSystem: true }}>
        <Probe />
      </RoadieProvider>
    )
    expect(seen.length).toBeGreaterThanOrEqual(2)
    expect(seen.at(-1)).toBe(seen.at(-2))
  })
})
