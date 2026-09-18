import { type ReactNode, StrictMode } from 'react'

import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Navigator } from '.'
import { Badge } from '../Badge'
import { Pane } from '../Pane'
import type { NavigatorSecondaryData } from './secondaryData'
import { FakeIcon, flushViewportMeasurement, testBrand } from './testUtils'
import { useNavigatorSecondary } from './useNavigatorSecondary'

const badge = <Badge>New</Badge>

function Probe({
  value,
  log
}: {
  value?: string
  log: (NavigatorSecondaryData | null)[]
}) {
  const data = useNavigatorSecondary(value)
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
  log
}: {
  value: string
  probeValue?: string
  log: (NavigatorSecondaryData | null)[]
}) {
  const primary = (
    <Navigator.Primary aria-label='Docs'>
      {testBrand}
      <Navigator.Item value='/' href='/' icon={<FakeIcon />}>
        Home
        <Navigator.Secondary aria-label='Home pages' overview>
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
            icon='📖'
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
      {primary}
      <Pane>
        <Probe value={probeValue} log={log} />
      </Pane>
    </Navigator>
  )
}

describe('useNavigatorSecondary', () => {
  it('returns the active secondary: loose items as an untitled group, the current row marked', async () => {
    const log: (NavigatorSecondaryData | null)[] = []
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
    const log: (NavigatorSecondaryData | null)[] = []
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
    expect(log.at(-1)!.groups[0]!.items[1]!.icon).toBeUndefined()
  })

  it('looks any secondary up by its item value', async () => {
    const log: (NavigatorSecondaryData | null)[] = []
    render(<Docs value='/' probeValue='/components' log={log} />)
    await flushViewportMeasurement()
    expect(log.at(-1)).toMatchObject({
      value: '/components',
      href: '/components'
    })
    expect(screen.getByTestId('probe')).toHaveTextContent('/components/button')
  })

  it('returns null for an unknown value, an item without a Secondary, or outside every destination', async () => {
    const log: (NavigatorSecondaryData | null)[] = []
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
    const log: (NavigatorSecondaryData | null)[] = []
    const html = renderToString(<Docs value='/overview/philosophy' log={log} />)
    expect(html).toContain(
      '/overview/installation /overview/philosophy* /migration'
    )
  })
})

describe('useNavigatorSecondary when the declaration changes', () => {
  const App = ({
    badgeText,
    log
  }: {
    badgeText: string
    log: (NavigatorSecondaryData | null)[]
  }) => (
    <StrictMode>
      <Navigator value='/overview/installation'>
        <Navigator.Primary aria-label='Docs'>
          {testBrand}
          <Navigator.Item value='/' href='/' icon={<FakeIcon />}>
            Home
            <Navigator.Secondary aria-label='Home pages' overview>
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
        <Pane>
          <Probe log={log} />
        </Pane>
      </Navigator>
    </StrictMode>
  )

  const badgeTextOf = (data: NavigatorSecondaryData | null | undefined) =>
    (data?.groups[0]?.items[0]?.badge?.props as { children?: ReactNode })
      ?.children

  it('updates when the structure changes, such as a badge text', async () => {
    const log: (NavigatorSecondaryData | null)[] = []
    const { rerender } = render(<App badgeText='New' log={log} />)
    await flushViewportMeasurement()
    expect(badgeTextOf(log.at(-1))).toBe('New')
    rerender(<App badgeText='Updated' log={log} />)
    await flushViewportMeasurement()
    expect(badgeTextOf(log.at(-1))).toBe('Updated')
  })
})
