import type { ReactNode } from 'react'

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Navigator } from '.'
import { Pane } from '../Pane'
import { secondaryBlocks, textOf } from './splitSecondary'
import { FakeIcon, flushViewportMeasurement, primaryOf } from './testUtils'

const panes = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-slot="pane"]'))
const sectionPane = () =>
  document.querySelector<HTMLElement>(
    '[data-slot="pane"][data-navigator-section]'
  )

function Docs({
  value = '/components/button',
  searchable = true,
  detailCurrent = true
}: {
  value?: string
  searchable?: boolean
  detailCurrent?: boolean
}) {
  return (
    <Navigator value={value}>
      <Navigator.Primary aria-label='Docs'>
        <Navigator.Item value='/start' href='/start' icon={<FakeIcon />}>
          Get started
        </Navigator.Item>
        <Navigator.Item
          value='/components'
          href='/components'
          icon={<FakeIcon />}
        >
          Components
          <Navigator.Secondary aria-label='Components' searchable={searchable}>
            <Navigator.Group>
              <Navigator.GroupTitle>Actions</Navigator.GroupTitle>
              <Navigator.Item
                value='/components/button'
                href='/components/button'
              >
                Button
              </Navigator.Item>
              <Navigator.Item
                value='/components/icon-button'
                href='/components/icon-button'
              >
                Icon button
              </Navigator.Item>
            </Navigator.Group>
            <Navigator.Group>
              <Navigator.GroupTitle>Forms</Navigator.GroupTitle>
              <Navigator.Item
                value='/components/input'
                href='/components/input'
              >
                Input
              </Navigator.Item>
            </Navigator.Group>
          </Navigator.Secondary>
        </Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content>
        <Pane role='detail' current={detailCurrent}>
          Detail
        </Pane>
      </Navigator.Content>
    </Navigator>
  )
}

describe('generated section pane', () => {
  it('leads the stack as a list pane titled with the section label', async () => {
    render(<Docs />)
    await flushViewportMeasurement()
    const pane = sectionPane()!
    expect(panes()[0]).toBe(pane)
    expect(pane).toHaveAttribute('data-role', 'list')
    expect(pane).toHaveAttribute('data-navigator-section', '/components')
    expect(
      within(pane).getByRole('heading', { name: 'Components', level: 2 })
    ).toHaveAttribute('data-slot', 'pane-title')
    expect(pane).toHaveAttribute('data-stack-position', 'behind')
    expect(panes()[1]).toHaveAttribute('data-stack-position', 'top')
  })

  it('is the top of the stack when no consumer pane is current', async () => {
    render(<Docs value='/components' detailCurrent={false} />)
    await flushViewportMeasurement()
    expect(sectionPane()).toHaveAttribute('data-stack-position', 'top')
  })

  it('keeps groups and marks the current row', async () => {
    render(<Docs />)
    await flushViewportMeasurement()
    const pane = sectionPane()!
    expect(within(pane).getByText('Actions')).toBeInTheDocument()
    expect(within(pane).getByText('Forms')).toBeInTheDocument()
    expect(pane.querySelectorAll('[data-slot="list-group"]').length).toBe(2)
    expect(within(pane).getByRole('link', { name: 'Button' })).toHaveAttribute(
      'aria-current',
      'page'
    )
    expect(
      within(pane).getByRole('link', { name: 'Input' })
    ).not.toHaveAttribute('aria-current')
    expect(
      within(pane).getByRole('navigation', { name: 'Components' })
    ).toHaveAttribute('data-slot', 'navigator-section-nav')
  })

  it('lights the section tile as the section, not the page', async () => {
    render(<Docs />)
    await flushViewportMeasurement()
    expect(
      within(primaryOf('vertical')).getByRole('link', { name: 'Components' })
    ).toHaveAttribute('aria-current', 'true')
  })

  it('never renders sub-pages in the vertical navigation', async () => {
    render(<Docs />)
    await flushViewportMeasurement()
    expect(within(primaryOf('vertical')).queryByText('Button')).toBeNull()
  })

  it('filters rows by label and hides groups left empty', async () => {
    const user = userEvent.setup()
    render(<Docs />)
    await flushViewportMeasurement()
    const pane = sectionPane()!
    await user.type(within(pane).getByRole('searchbox'), 'inp')
    expect(
      within(pane).getByRole('link', { name: 'Input' })
    ).toBeInTheDocument()
    expect(within(pane).queryByRole('link', { name: 'Button' })).toBeNull()
    expect(within(pane).queryByText('Actions')).toBeNull()
    await user.clear(within(pane).getByRole('searchbox'))
    await user.type(within(pane).getByRole('searchbox'), 'zzz')
    expect(within(pane).getByText('No matches')).toHaveAttribute(
      'data-slot',
      'navigator-secondary-empty'
    )
  })

  it('offers no search unless the Secondary is searchable', async () => {
    render(<Docs searchable={false} />)
    await flushViewportMeasurement()
    expect(within(sectionPane()!).queryByRole('searchbox')).toBeNull()
  })

  it('mounts only for the active section, and not for a section without Secondary', async () => {
    render(<Docs value='/start' />)
    await flushViewportMeasurement()
    expect(sectionPane()).toBeNull()
  })

  it('resets its search when the section changes', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<Docs />)
    await flushViewportMeasurement()
    await user.type(within(sectionPane()!).getByRole('searchbox'), 'inp')
    rerender(<Docs value='/start' />)
    await flushViewportMeasurement()
    rerender(<Docs />)
    await flushViewportMeasurement()
    expect(within(sectionPane()!).getByRole('searchbox')).toHaveValue('')
  })

  it('gives way to the More pane while it is open', async () => {
    const user = userEvent.setup()
    render(
      <Navigator value='/a/one'>
        <Navigator.Primary aria-label='Main'>
          <Navigator.Item value='/a' href='/a'>
            A
            <Navigator.Secondary aria-label='A pages'>
              <Navigator.Item value='/a/one' href='/a/one'>
                One
              </Navigator.Item>
            </Navigator.Secondary>
          </Navigator.Item>
          <Navigator.Item value='/b' href='/b'>
            B
          </Navigator.Item>
          <Navigator.Item value='/c' href='/c'>
            C
          </Navigator.Item>
          <Navigator.Item value='/d' href='/d'>
            D
          </Navigator.Item>
          <Navigator.Item value='/e' href='/e'>
            E
          </Navigator.Item>
          <Navigator.Item value='/f' href='/f'>
            F
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Pane role='detail' current>
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(sectionPane()).not.toBeNull()
    await user.click(
      within(primaryOf('horizontal')).getByRole('button', { name: 'More' })
    )
    await flushViewportMeasurement()
    expect(sectionPane()).toBeNull()
    expect(screen.getByRole('heading', { name: 'More' })).toBeInTheDocument()
  })
})

describe('section pane groups', () => {
  it('keeps an untitled group as its own group, with no empty title', async () => {
    render(
      <Navigator value='/a/one'>
        <Navigator.Primary aria-label='Main'>
          <Navigator.Item value='/a' href='/a'>
            A
            <Navigator.Secondary aria-label='A pages'>
              <Navigator.Item value='/a/one' href='/a/one'>
                One
              </Navigator.Item>
              <Navigator.Group>
                <Navigator.Item value='/a/two' href='/a/two'>
                  Two
                </Navigator.Item>
              </Navigator.Group>
              <Navigator.Group>
                <Navigator.GroupTitle />
                <Navigator.Item value='/a/three' href='/a/three'>
                  Three
                </Navigator.Item>
              </Navigator.Group>
            </Navigator.Secondary>
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Pane role='detail' current>
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    const pane = sectionPane()!
    const groups = pane.querySelectorAll('[data-slot="list-group"]')
    expect(groups).toHaveLength(2)
    expect(
      within(groups[0] as HTMLElement).getByText('Two')
    ).toBeInTheDocument()
    expect(
      within(groups[1] as HTMLElement).getByText('Three')
    ).toBeInTheDocument()
    expect(pane.querySelector('[data-slot="list-group-title"]')).toBeNull()
  })
})

describe('textOf', () => {
  it('flattens strings, numbers and element children', () => {
    expect(textOf(['Icon ', <b key='b'>button</b>, 2])).toBe('Icon button2')
  })
})

describe('secondaryBlocks', () => {
  it('keeps loose items and titled groups in authored order', () => {
    const blocks = secondaryBlocks([
      <Navigator.Item key='a' value='/a'>
        A
      </Navigator.Item>,
      <Navigator.Item key='b' value='/b'>
        B
      </Navigator.Item>,
      <Navigator.Group key='group'>
        <Navigator.GroupTitle>Group</Navigator.GroupTitle>
        <Navigator.Item value='/c'>C</Navigator.Item>
      </Navigator.Group>
    ])
    expect(
      blocks.map((block) => ({
        kind: block.kind,
        title: block.title,
        values: block.items.map((item) => item.props.value)
      }))
    ).toEqual([
      { kind: 'loose', title: null, values: ['/a', '/b'] },
      { kind: 'group', title: 'Group', values: ['/c'] }
    ])
  })
})

const Wrapper = ({ children }: { children: ReactNode }) => <>{children}</>

function Override({ wrapped = false }: { wrapped?: boolean }) {
  const pane = (
    <Navigator.SecondaryPane value='/components'>
      <p>Promo</p>
      <Navigator.SecondaryItems query='in' />
    </Navigator.SecondaryPane>
  )
  return (
    <Navigator value='/components/button'>
      <Navigator.Primary aria-label='Docs'>
        <Navigator.Item value='/components' href='/components'>
          Components
          <Navigator.Secondary aria-label='Components'>
            <Navigator.Item
              value='/components/button'
              href='/components/button'
            >
              Button
            </Navigator.Item>
            <Navigator.Item value='/components/input' href='/components/input'>
              Input
            </Navigator.Item>
          </Navigator.Secondary>
        </Navigator.Item>
        <Navigator.Item value='/start' href='/start'>
          Start
        </Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content>
        {wrapped ? <Wrapper>{pane}</Wrapper> : pane}
        <Pane role='detail' current>
          Detail
        </Pane>
      </Navigator.Content>
    </Navigator>
  )
}

describe('Navigator.SecondaryPane', () => {
  it("replaces that section's generated pane", async () => {
    render(<Override />)
    await flushViewportMeasurement()
    const lists = document.querySelectorAll('[data-navigator-section]')
    expect(lists).toHaveLength(1)
    expect(
      within(lists[0] as HTMLElement).getByText('Promo')
    ).toBeInTheDocument()
  })

  it('filters SecondaryItems by query', async () => {
    render(<Override />)
    await flushViewportMeasurement()
    const pane = sectionPane()!
    expect(
      within(pane).getByRole('link', { name: 'Input' })
    ).toBeInTheDocument()
    expect(within(pane).queryByRole('link', { name: 'Button' })).toBeNull()
  })

  it('still suppresses the generated pane when wrapped', async () => {
    render(<Override wrapped />)
    await flushViewportMeasurement()
    expect(document.querySelectorAll('[data-navigator-section]')).toHaveLength(
      1
    )
    expect(screen.getByText('Promo')).toBeInTheDocument()
  })

  it('renders nothing while its section is not active', async () => {
    const { rerender } = render(<Override />)
    await flushViewportMeasurement()
    rerender(
      <Navigator value='/start'>
        <Navigator.Primary aria-label='Docs'>
          <Navigator.Item value='/start' href='/start'>
            Start
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Navigator.SecondaryPane value='/components'>
            <p>Promo</p>
          </Navigator.SecondaryPane>
          <Pane role='detail' current>
            Start
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(screen.queryByText('Promo')).toBeNull()
  })
})

function InactiveOverride({
  value,
  wrapped = false,
  detail = false
}: {
  value: string
  wrapped?: boolean
  detail?: boolean
}) {
  const pane = (
    <Navigator.SecondaryPane value='/components'>
      <p>Promo</p>
    </Navigator.SecondaryPane>
  )
  return (
    <Navigator value={value}>
      <Navigator.Primary aria-label='Docs'>
        <Navigator.Item value='/components' href='/components'>
          Components
          <Navigator.Secondary aria-label='Components'>
            <Navigator.Item
              value='/components/button'
              href='/components/button'
            >
              Button
            </Navigator.Item>
          </Navigator.Secondary>
        </Navigator.Item>
        <Navigator.Item value='/start' href='/start'>
          Start
        </Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content>
        {wrapped ? <Wrapper>{pane}</Wrapper> : pane}
        {detail ? (
          <Pane role='detail' current>
            Detail
          </Pane>
        ) : null}
      </Navigator.Content>
    </Navigator>
  )
}

describe('Navigator.SecondaryPane and the no-panes warning', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('warns when the only pane is an inactive override', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(<InactiveOverride value='/start' />)
    await flushViewportMeasurement()
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('identified no panes')
    )
  })

  it('warns once a wrapped override goes inactive with no other pane', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { rerender } = render(
      <InactiveOverride value='/components/button' wrapped detail />
    )
    await flushViewportMeasurement()
    expect(warn).not.toHaveBeenCalled()
    rerender(<InactiveOverride value='/start' wrapped />)
    await flushViewportMeasurement()
    expect(screen.queryByText('Promo')).toBeNull()
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('identified no panes')
    )
  })

  it('counts as a consumer pane while its section is active', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { rerender } = render(
      <InactiveOverride value='/components/button' wrapped detail />
    )
    await flushViewportMeasurement()
    rerender(<InactiveOverride value='/components/button' wrapped />)
    await flushViewportMeasurement()
    expect(screen.getByText('Promo')).toBeInTheDocument()
    expect(warn).not.toHaveBeenCalled()
  })
})
