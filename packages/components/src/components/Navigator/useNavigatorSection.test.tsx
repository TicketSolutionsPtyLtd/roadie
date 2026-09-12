import { type ReactNode, StrictMode } from 'react'

import { act, render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { Navigator } from '.'
import { Badge } from '../Badge'
import { Pane } from '../Pane'
import type { NavigatorSectionData } from './sectionData'
import { FakeIcon, flushViewportMeasurement, testBrand } from './testUtils'
import { useNavigatorSection } from './useNavigatorSection'

const Wrapper = ({ children }: { children: ReactNode }) => <>{children}</>

const badge = <Badge>New</Badge>

function Probe({
  value,
  log
}: {
  value?: string
  log: (NavigatorSectionData | null)[]
}) {
  const data = useNavigatorSection(value)
  log.push(data)
  return (
    <span data-testid='probe'>
      {data === null
        ? 'none'
        : data.groups
            .flatMap((group) => group.items)
            .map((item) => `${item.value}${item.current ? '*' : ''}`)
            .join(' ')}
    </span>
  )
}

function Docs({
  value,
  probeValue,
  log,
  wrapPrimary = false,
  primaryShown = true
}: {
  value: string
  probeValue?: string
  log: (NavigatorSectionData | null)[]
  wrapPrimary?: boolean
  primaryShown?: boolean
}) {
  const primary = (
    <Navigator.Primary aria-label='Docs'>
      {testBrand}
      <Navigator.Item value='/' href='/' icon={<FakeIcon />}>
        Home
        <Navigator.Secondary aria-label='Home pages' root='page'>
          <Navigator.Item
            value='/overview/installation'
            href='/overview/installation'
            description='Set up the packages'
            icon={<FakeIcon />}
            badge={badge}
          >
            Installation
          </Navigator.Item>
          <Navigator.Item
            value='/overview/philosophy'
            href='/overview/philosophy'
          >
            Philosophy
          </Navigator.Item>
          <Navigator.Group>
            <Navigator.GroupTitle>Reference</Navigator.GroupTitle>
            <Navigator.Item value='/migration' href='/migration'>
              Migrating to v2
            </Navigator.Item>
          </Navigator.Group>
        </Navigator.Secondary>
      </Navigator.Item>
      <Navigator.Item value='/components' href='/components'>
        Components
        <Navigator.Secondary aria-label='Components'>
          <Navigator.Item value='/components/button' href='/components/button'>
            Button
          </Navigator.Item>
        </Navigator.Secondary>
      </Navigator.Item>
      <Navigator.Item value='/about' href='/about'>
        About
      </Navigator.Item>
    </Navigator.Primary>
  )
  return (
    <Navigator value={value}>
      {primaryShown && (wrapPrimary ? <Wrapper>{primary}</Wrapper> : primary)}
      <Navigator.Content>
        <Pane role='detail' current>
          <Probe value={probeValue} log={log} />
        </Pane>
      </Navigator.Content>
    </Navigator>
  )
}

describe('useNavigatorSection', () => {
  it('returns the active section: loose items as an untitled group, the current row marked', async () => {
    const log: (NavigatorSectionData | null)[] = []
    render(<Docs value='/overview/philosophy' log={log} />)
    await flushViewportMeasurement()
    const data = log.at(-1)!
    expect(data).toMatchObject({ value: '/', href: '/' })
    expect(data.label).toEqual(['Home'])
    expect(data.groups.map((group) => group.title)).toEqual([
      undefined,
      'Reference'
    ])
    expect(
      data.groups.map((group) => group.items.map((item) => item.value))
    ).toEqual([
      ['/overview/installation', '/overview/philosophy'],
      ['/migration']
    ])
    expect(data.groups[0]!.items.map((item) => item.current)).toEqual([
      false,
      true
    ])
  })

  it('carries label, href, icon, description and the badge element', async () => {
    const log: (NavigatorSectionData | null)[] = []
    render(<Docs value='/' log={log} />)
    await flushViewportMeasurement()
    const installation = log.at(-1)!.groups[0]!.items[0]!
    expect(installation).toMatchObject({
      value: '/overview/installation',
      href: '/overview/installation',
      description: 'Set up the packages',
      current: false
    })
    expect(installation.label).toEqual(['Installation'])
    expect(installation.icon?.type).toBe(FakeIcon)
    expect(installation.badge).toBe(badge)
    expect(log.at(-1)!.groups[0]!.items[1]!.description).toBeUndefined()
  })

  it('looks any section up by its item value', async () => {
    const log: (NavigatorSectionData | null)[] = []
    render(<Docs value='/' probeValue='/components' log={log} />)
    await flushViewportMeasurement()
    expect(log.at(-1)).toMatchObject({
      value: '/components',
      href: '/components'
    })
    expect(screen.getByTestId('probe')).toHaveTextContent('/components/button')
  })

  it('returns null for an unknown value, an item without a Secondary, or outside every section', async () => {
    const log: (NavigatorSectionData | null)[] = []
    const { rerender } = render(
      <Docs value='/about' probeValue='/nowhere' log={log} />
    )
    await flushViewportMeasurement()
    expect(log.at(-1)).toBeNull()
    rerender(<Docs value='/about' probeValue='/about' log={log} />)
    expect(log.at(-1)).toBeNull()
    rerender(<Docs value='/about' log={log} />)
    expect(log.at(-1)).toBeNull()
  })

  it('is computed in the server render', () => {
    const log: (NavigatorSectionData | null)[] = []
    const html = renderToString(<Docs value='/overview/philosophy' log={log} />)
    expect(html).toContain(
      '/overview/installation /overview/philosophy* /migration'
    )
  })

  it('falls back to what a wrapped Primary publishes after mount', async () => {
    const log: (NavigatorSectionData | null)[] = []
    render(
      <StrictMode>
        <Docs
          value='/overview/philosophy'
          probeValue='/components'
          log={log}
          wrapPrimary
        />
      </StrictMode>
    )
    expect(log[0]).toBeNull()
    await act(async () => {
      await Promise.resolve()
    })
    await flushViewportMeasurement()
    expect(log.at(-1)).toMatchObject({ value: '/components' })
  })

  it('follows a value change after mount with a wrapped Primary', async () => {
    const log: (NavigatorSectionData | null)[] = []
    const { rerender } = render(
      <Docs value='/overview/philosophy' log={log} wrapPrimary />
    )
    await flushViewportMeasurement()
    expect(log.at(-1)).toMatchObject({ value: '/' })
    rerender(<Docs value='/components/button' log={log} wrapPrimary />)
    await flushViewportMeasurement()
    expect(log.at(-1)).toMatchObject({ value: '/components' })
  })

  it('clears the section when a wrapped Primary unmounts', async () => {
    const log: (NavigatorSectionData | null)[] = []
    const { rerender } = render(
      <StrictMode>
        <Docs value='/overview/philosophy' log={log} wrapPrimary />
      </StrictMode>
    )
    await flushViewportMeasurement()
    expect(log.at(-1)).toMatchObject({ value: '/' })
    rerender(
      <StrictMode>
        <Docs
          value='/overview/philosophy'
          log={log}
          wrapPrimary
          primaryShown={false}
        />
      </StrictMode>
    )
    await flushViewportMeasurement()
    expect(log.at(-1)).toBeNull()
  })
})

describe('useNavigatorSection in the component that wraps Primary', () => {
  function AppNav({
    badgeText,
    log
  }: {
    badgeText: string
    log: (NavigatorSectionData | null)[]
  }) {
    log.push(useNavigatorSection())
    return (
      <Navigator.Primary aria-label='Docs'>
        {testBrand}
        <Navigator.Item value='/' href='/' icon={<FakeIcon />}>
          Home
          <Navigator.Secondary aria-label='Home pages' root='page'>
            <Navigator.Item
              value='/overview/installation'
              href='/overview/installation'
              icon={<FakeIcon />}
              badge={<Badge>{badgeText}</Badge>}
            >
              Installation
            </Navigator.Item>
          </Navigator.Secondary>
        </Navigator.Item>
      </Navigator.Primary>
    )
  }

  const App = ({
    badgeText = 'New',
    log
  }: {
    badgeText?: string
    log: (NavigatorSectionData | null)[]
  }) => (
    <StrictMode>
      <Navigator value='/overview/installation'>
        <AppNav badgeText={badgeText} log={log} />
        <Navigator.Content>
          <Pane role='detail' current>
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    </StrictMode>
  )

  const badgeTextOf = (data: NavigatorSectionData | null | undefined) =>
    (data?.groups[0]?.items[0]?.badge?.props as { children?: ReactNode })
      ?.children

  it('settles instead of republishing fresh children forever', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const log: (NavigatorSectionData | null)[] = []
    render(<App log={log} />)
    await flushViewportMeasurement()
    expect(error).not.toHaveBeenCalled()
    error.mockRestore()
    expect(log.at(-1)).toMatchObject({ value: '/', href: '/' })
    expect(log.length).toBeLessThan(20)
  })

  it('updates when the structure changes, such as a badge text', async () => {
    const log: (NavigatorSectionData | null)[] = []
    const { rerender } = render(<App log={log} />)
    await flushViewportMeasurement()
    expect(badgeTextOf(log.at(-1))).toBe('New')
    rerender(<App badgeText='Updated' log={log} />)
    await flushViewportMeasurement()
    expect(badgeTextOf(log.at(-1))).toBe('Updated')
  })
})
