import { type ReactNode, useLayoutEffect, useRef } from 'react'

import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Navigator } from '.'
import { Badge } from '../Badge'
import { Pane } from '../Pane'
import { secondaryBlocks, textOf } from './splitSecondary'
import {
  FakeIcon,
  flushViewportMeasurement,
  primaryOf,
  testBrand,
  withStubLink
} from './testUtils'

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
        {testBrand}
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

  it('ends each row with a chevron, after any badge', async () => {
    render(
      <Navigator value='/c'>
        <Navigator.Primary aria-label='Docs'>
          {testBrand}
          <Navigator.Item value='/c' href='/c'>
            Components
            <Navigator.Secondary aria-label='Components'>
              <Navigator.Item value='/c/a' href='/c/a'>
                Alpha
              </Navigator.Item>
              <Navigator.Item
                value='/c/b'
                href='/c/b'
                badge={<Badge>New</Badge>}
              >
                Beta
              </Navigator.Item>
            </Navigator.Secondary>
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content />
      </Navigator>
    )
    await flushViewportMeasurement()
    const pane = sectionPane()!
    const trailing = (name: string) =>
      within(pane)
        .getByRole('link', { name: new RegExp(name) })
        .querySelector('[data-slot="list-item-content"]')!.lastElementChild!
    expect(trailing('Alpha').querySelector('svg')).not.toBeNull()
    const beta = [...trailing('Beta').children]
    expect(beta.at(-1)?.tagName.toLowerCase()).toBe('svg')
    expect(beta[0]).toHaveTextContent('New')
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
          {testBrand}
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

describe('section pane search', () => {
  const search = async () => {
    const user = userEvent.setup()
    render(<Docs />)
    await flushViewportMeasurement()
    const pane = sectionPane()!
    return {
      user,
      pane,
      root: pane.querySelector<HTMLElement>('[data-slot="navigator-search"]')!,
      field: within(pane).getByRole('searchbox', { name: 'Search components' }),
      cancel: within(pane).getByRole('button', { name: 'Cancel search' })
    }
  }

  it('is a full-size pill, at 16px so iOS never zooms it', async () => {
    const { field } = await search()
    expect(field).toHaveAttribute('data-slot', 'navigator-search-field')
    expect(field).toHaveAttribute('placeholder', 'Search')
    expect(field).toHaveClass(
      'h-12',
      'text-base',
      'rounded-full',
      'emphasis-raised',
      'is-translucent',
      'is-interactive-field'
    )
    expect(field).not.toHaveClass('text-sm', 'rounded-lg', 'bg-subtle')
  })

  it('leads with a hidden magnifying glass', async () => {
    const { root } = await search()
    const icon = root.querySelector('[data-slot="navigator-search-icon"]')
    expect(icon?.tagName.toLowerCase()).toBe('svg')
    expect(icon).toHaveAttribute('aria-hidden', 'true')
    expect(icon).toHaveClass('size-5', 'text-subtle')
  })

  it('hides Cancel until focus is inside the search', async () => {
    const { user, root, field, cancel } = await search()
    const slot = cancel.parentElement!
    expect(slot).toHaveAttribute('data-slot', 'navigator-search-cancel-slot')
    expect(slot).toHaveClass(
      'invisible',
      'opacity-0',
      'w-0',
      'group-focus-within/search:visible',
      'group-focus-within/search:opacity-100',
      'motion-reduce:transition-none'
    )
    expect(root).toHaveClass('group/search')
    expect(root.matches(':focus-within')).toBe(false)

    await user.click(field)
    expect(root.matches(':focus-within')).toBe(true)
    await user.tab()
    expect(cancel).toHaveFocus()
    expect(root.matches(':focus-within')).toBe(true)
  })

  it('keeps focus in the field when Cancel is pressed', async () => {
    const { cancel } = await search()
    expect(fireEvent.pointerDown(cancel)).toBe(false)
  })

  it('clears the query, restores every row and leaves the field on Cancel', async () => {
    const { user, pane, root, field, cancel } = await search()
    await user.type(field, 'inp')
    expect(within(pane).queryByRole('link', { name: 'Button' })).toBeNull()

    await user.click(cancel)
    expect(field).toHaveValue('')
    expect(root.matches(':focus-within')).toBe(false)
    for (const name of ['Button', 'Icon button', 'Input']) {
      expect(within(pane).getByRole('link', { name })).toBeInTheDocument()
    }
  })

  it('clears the query and leaves the field on Escape', async () => {
    const { user, pane, field } = await search()
    await user.type(field, 'inp')
    await user.keyboard('{Escape}')
    expect(field).toHaveValue('')
    expect(field).not.toHaveFocus()
    expect(
      within(pane).getByRole('link', { name: 'Button' })
    ).toBeInTheDocument()
  })
})

describe('section pane groups', () => {
  it('keeps an untitled group as its own group, with no empty title', async () => {
    render(
      <Navigator value='/a/one'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
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
        {testBrand}
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

  it('ends its SecondaryItems rows with a chevron', async () => {
    render(<Override />)
    await flushViewportMeasurement()
    expect(
      within(sectionPane()!)
        .getByRole('link', { name: 'Input' })
        .querySelector('svg')
    ).not.toBeNull()
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
          {testBrand}
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
        {testBrand}
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

function Routed({
  value,
  showList,
  onShowListChange,
  detailBackHref,
  detailExtra
}: {
  value: string
  showList?: boolean
  onShowListChange?: (next: boolean) => void
  detailBackHref?: string
  detailExtra?: ReactNode
}) {
  return (
    <Navigator
      value={value}
      showList={showList}
      onShowListChange={onShowListChange}
    >
      <Navigator.Primary aria-label='Docs'>
        {testBrand}
        <Navigator.Item value='/components' href='/components'>
          Components
          <Navigator.Secondary aria-label='Components'>
            <Navigator.Item value='/components/a' href='/components/a'>
              A
            </Navigator.Item>
            <Navigator.Item value='/components/b' href='/components/b'>
              B
            </Navigator.Item>
          </Navigator.Secondary>
        </Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content>
        <Pane role='detail' current>
          <Pane.Header backHref={detailBackHref} />
          Detail
          {detailExtra}
        </Pane>
      </Navigator.Content>
    </Navigator>
  )
}

// Records, at each commit it renders in, what its pane shows.
function CommitProbe({
  log
}: {
  log: { position: string | null; back: boolean }[]
}) {
  const ref = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const pane = ref.current?.closest<HTMLElement>('[data-slot="pane"]')
    log.push({
      position: pane?.getAttribute('data-stack-position') ?? null,
      back: pane?.querySelector('[aria-label="Back"]') != null
    })
  })
  return <span ref={ref} data-slot='commit-probe' />
}

const horizontal = () => primaryOf('horizontal')

// Base UI's Button keeps role="button" on the anchor it renders for an href.
const backOf = (pane: HTMLElement) => {
  const back = within(pane).getByLabelText('Back')
  expect(back.tagName).toBe('A')
  return back
}

describe('section routes', () => {
  it('puts the list on top on the section route, even with a current detail', async () => {
    render(<Routed value='/components' />)
    await flushViewportMeasurement()
    expect(sectionPane()).toHaveAttribute('data-stack-position', 'top')
    expect(panes()[1]).toHaveAttribute('data-stack-position', 'ahead')
  })

  it('puts the page on top on a sub-page, with Back linking to the section route', async () => {
    render(<Routed value='/components/a' />)
    await flushViewportMeasurement()
    const detail = panes()[1]!
    expect(detail).toHaveAttribute('data-stack-position', 'top')
    expect(backOf(detail)).toHaveAttribute('href', '/components')
  })

  it('draws Back in the same commit that makes the sub-page the top', async () => {
    const log: { position: string | null; back: boolean }[] = []
    const { rerender } = render(
      <Routed value='/components' detailExtra={<CommitProbe log={log} />} />
    )
    await flushViewportMeasurement()
    log.length = 0
    rerender(
      <Routed value='/components/a' detailExtra={<CommitProbe log={log} />} />
    )
    expect(log[0]).toEqual({ position: 'top', back: true })
    await flushViewportMeasurement()
  })

  it('gives no Back on a sub-page of a routeless section', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Navigator value='/x/one'>
        <Navigator.Primary aria-label='Docs'>
          {testBrand}
          <Navigator.Item value='/x'>
            X
            <Navigator.Secondary aria-label='X pages'>
              <Navigator.Item value='/x/one' href='/x/one'>
                One
              </Navigator.Item>
            </Navigator.Secondary>
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Pane role='detail' current>
            <Pane.Header />
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(panes()[1]).toHaveAttribute('data-stack-position', 'top')
    expect(screen.queryByLabelText('Back')).toBeNull()
    warn.mockRestore()
  })

  it('lets an open More pane suppress both the reveal and the Back', async () => {
    const user = userEvent.setup()
    render(
      <Navigator value='/a/one' showList>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          <Navigator.Item value='/a' href='/a'>
            A
            <Navigator.Secondary aria-label='A pages'>
              <Navigator.Item value='/a/one' href='/a/one'>
                One
              </Navigator.Item>
            </Navigator.Secondary>
          </Navigator.Item>
          {['/b', '/c', '/d', '/e', '/f'].map((value) => (
            <Navigator.Item key={value} value={value} href={value}>
              {value.slice(1).toUpperCase()}
            </Navigator.Item>
          ))}
        </Navigator.Primary>
        <Navigator.Content>
          <Pane role='detail' current>
            <Pane.Header />
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    await user.click(within(horizontal()).getByRole('button', { name: 'More' }))
    await flushViewportMeasurement()
    const more = screen
      .getByRole('heading', { name: 'More' })
      .closest<HTMLElement>('[data-slot="pane"]')
    expect(more).toHaveAttribute('data-stack-position', 'top')
    expect(panes()[0]).not.toHaveAttribute('data-stack-position', 'top')
    expect(screen.queryByLabelText('Back')).toBeNull()
  })

  it("lets a consumer's backHref win", async () => {
    render(<Routed value='/components/a' detailBackHref='/elsewhere' />)
    await flushViewportMeasurement()
    expect(backOf(panes()[1]!)).toHaveAttribute('href', '/elsewhere')
  })

  it('shows the list over a sub-page while showList is set', async () => {
    render(<Routed value='/components/a' showList />)
    await flushViewportMeasurement()
    expect(sectionPane()).toHaveAttribute('data-stack-position', 'top')
    expect(
      within(sectionPane()!).getByRole('link', { name: 'A' })
    ).toHaveAttribute('aria-current', 'page')
  })

  it('links the active tab to the section route when showList is not wired', async () => {
    render(<Routed value='/components/a' />)
    await flushViewportMeasurement()
    expect(
      within(horizontal()).getByRole('link', { name: 'Components' })
    ).toHaveAttribute('href', '/components')
  })

  it('asks for the list instead when onShowListChange is wired', async () => {
    const user = userEvent.setup()
    const onShowListChange = vi.fn()
    render(<Routed value='/components/a' onShowListChange={onShowListChange} />)
    await flushViewportMeasurement()
    await user.click(
      within(horizontal()).getByRole('link', { name: 'Components' })
    )
    expect(onShowListChange).toHaveBeenCalledWith(true)
  })

  it('asks to hide the list when the active tab is tapped again', async () => {
    const user = userEvent.setup()
    const onShowListChange = vi.fn()
    render(
      <Routed
        value='/components/a'
        showList
        onShowListChange={onShowListChange}
      />
    )
    await flushViewportMeasurement()
    await user.click(
      within(horizontal()).getByRole('link', { name: 'Components' })
    )
    expect(onShowListChange).toHaveBeenCalledWith(false)
  })

  it('links an inactive section tab to its route, never a remembered page', async () => {
    const { rerender } = render(<Routed value='/components/b' />)
    await flushViewportMeasurement()
    rerender(<Routed value='/other' />)
    await flushViewportMeasurement()
    expect(
      within(horizontal()).getByRole('link', { name: 'Components' })
    ).toHaveAttribute('href', '/components')
  })

  it('warns when a section has no route', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Navigator value='/x/one'>
        <Navigator.Primary aria-label='Docs'>
          {testBrand}
          <Navigator.Item value='/x'>
            X
            <Navigator.Secondary aria-label='X pages'>
              <Navigator.Item value='/x/one' href='/x/one'>
                One
              </Navigator.Item>
            </Navigator.Secondary>
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('its own route'))
    warn.mockRestore()
  })
})

function PageRooted({
  value,
  showList,
  onShowListChange,
  onValueChange,
  override = false
}: {
  value: string
  showList?: boolean
  onShowListChange?: (next: boolean) => void
  onValueChange?: (next: string) => void
  override?: boolean
}) {
  return (
    <Navigator
      value={value}
      showList={showList}
      onShowListChange={onShowListChange}
      onValueChange={onValueChange}
    >
      <Navigator.Primary aria-label='Docs'>
        {testBrand}
        <Navigator.Item value='/' href='/'>
          Home
          <Navigator.Secondary aria-label='Home pages' root='page'>
            <Navigator.Item
              value='/overview/installation'
              href='/overview/installation'
            >
              Installation
            </Navigator.Item>
            <Navigator.Item
              value='/overview/philosophy'
              href='/overview/philosophy'
            >
              Philosophy
            </Navigator.Item>
          </Navigator.Secondary>
        </Navigator.Item>
        <Navigator.Item value='/components' href='/components'>
          Components
        </Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content>
        {override ? (
          <Navigator.SecondaryPane value='/'>
            <p>Promo</p>
            <Navigator.SecondaryItems />
          </Navigator.SecondaryPane>
        ) : null}
        <Pane role='detail' current>
          <Pane.Header />
          Detail
        </Pane>
      </Navigator.Content>
    </Navigator>
  )
}

describe('page roots', () => {
  it('mounts no list pane on the section route, where the page is the root with no Back', async () => {
    render(<PageRooted value='/' />)
    await flushViewportMeasurement()
    expect(sectionPane()).toBeNull()
    expect(panes()).toHaveLength(1)
    expect(panes()[0]).toHaveAttribute('data-stack-position', 'top')
    expect(screen.queryByLabelText('Back')).toBeNull()
  })

  it('pushes a sub-page over the list, with Back to the section route', async () => {
    render(<PageRooted value='/overview/philosophy' />)
    await flushViewportMeasurement()
    expect(sectionPane()).toHaveAttribute('data-stack-position', 'behind')
    const detail = panes()[1]!
    expect(detail).toHaveAttribute('data-stack-position', 'top')
    expect(backOf(detail)).toHaveAttribute('href', '/')
    expect(
      within(sectionPane()!).getByRole('link', { name: 'Philosophy' })
    ).toHaveAttribute('aria-current', 'page')
  })

  it('ignores showList on the root', async () => {
    render(<PageRooted value='/' showList />)
    await flushViewportMeasurement()
    expect(sectionPane()).toBeNull()
    expect(panes()[0]).toHaveAttribute('data-stack-position', 'top')
    expect(screen.queryByLabelText('Back')).toBeNull()
  })

  it('still shows the list over a sub-page with showList', async () => {
    render(<PageRooted value='/overview/philosophy' showList />)
    await flushViewportMeasurement()
    expect(sectionPane()).toHaveAttribute('data-stack-position', 'top')
  })

  it('applies a SecondaryPane override only on sub-pages', async () => {
    const { rerender } = render(<PageRooted value='/' override />)
    await flushViewportMeasurement()
    expect(document.querySelector('[data-navigator-section]')).toBeNull()
    expect(screen.queryByText('Promo')).toBeNull()
    expect(panes()[0]).toHaveAttribute('data-stack-position', 'top')
    rerender(<PageRooted value='/overview/installation' override />)
    await flushViewportMeasurement()
    expect(screen.getByText('Promo')).toBeInTheDocument()
    expect(sectionPane()).toHaveAttribute('data-stack-position', 'behind')
    expect(document.querySelectorAll('[data-navigator-section]')).toHaveLength(
      1
    )
  })

  it('treats a routeless page root as a list root', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Navigator value='/x'>
        <Navigator.Primary aria-label='Docs'>
          {testBrand}
          <Navigator.Item value='/x'>
            X
            <Navigator.Secondary aria-label='X pages' root='page'>
              <Navigator.Item value='/x/one' href='/x/one'>
                One
              </Navigator.Item>
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
    expect(sectionPane()).toHaveAttribute('data-stack-position', 'top')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('its own route'))
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })
})

describe('page root tab', () => {
  const viewportScrollSpy = () => {
    const scrollTo = vi.fn()
    document.querySelector<HTMLElement>(
      '[data-slot="pane-viewport"]'
    )!.scrollTo = scrollTo
    return scrollTo
  }

  it('goes to the root from a sub-page, even with onShowListChange wired', async () => {
    const user = userEvent.setup()
    const onShowListChange = vi.fn()
    const onValueChange = vi.fn()
    render(
      withStubLink(
        <PageRooted
          value='/overview/philosophy'
          onShowListChange={onShowListChange}
          onValueChange={onValueChange}
        />
      )
    )
    await flushViewportMeasurement()
    const home = within(horizontal()).getByRole('link', { name: 'Home' })
    expect(home).toHaveAttribute('href', '/')
    await user.click(home)
    expect(onShowListChange).not.toHaveBeenCalled()
    expect(onValueChange).toHaveBeenCalledWith('/')
  })

  it('scrolls the page to the top on the root', async () => {
    const user = userEvent.setup()
    const onShowListChange = vi.fn()
    const onValueChange = vi.fn()
    render(
      <PageRooted
        value='/'
        onShowListChange={onShowListChange}
        onValueChange={onValueChange}
      />
    )
    await flushViewportMeasurement()
    const scrollTo = viewportScrollSpy()
    await user.click(within(horizontal()).getByRole('link', { name: 'Home' }))
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }))
    expect(onShowListChange).not.toHaveBeenCalled()
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('still toggles the list for a list-first section', async () => {
    const user = userEvent.setup()
    const onShowListChange = vi.fn()
    render(<Routed value='/components/a' onShowListChange={onShowListChange} />)
    await flushViewportMeasurement()
    await user.click(
      within(horizontal()).getByRole('link', { name: 'Components' })
    )
    expect(onShowListChange).toHaveBeenCalledWith(true)
  })
})

describe('row handlers resolve at click time', () => {
  function Sections({ count, seen }: { count: number; seen: number[] }) {
    return (
      <Navigator.Primary aria-label='Docs'>
        {testBrand}
        <Navigator.Item value='/components' href='/components'>
          Components
          <Navigator.Secondary aria-label='Components'>
            <Navigator.Item
              value='/components/button'
              href='/components/button'
              onClick={() => seen.push(count)}
            >
              Button
            </Navigator.Item>
          </Navigator.Secondary>
        </Navigator.Item>
        {['/a', '/b', '/c', '/d'].map((v) => (
          <Navigator.Item key={v} value={v} href={v}>
            {v}
          </Navigator.Item>
        ))}
        <Navigator.Item value='/e' href='/e' onClick={() => seen.push(count)}>
          /e
        </Navigator.Item>
      </Navigator.Primary>
    )
  }

  const app = (count: number, seen: number[], wrapped: boolean) =>
    withStubLink(
      <Navigator value='/components'>
        {wrapped ? (
          <Sections count={count} seen={seen} />
        ) : (
          Sections({ count, seen })
        )}
        <Navigator.Content>
          <Pane role='detail'>Detail</Pane>
        </Navigator.Content>
      </Navigator>
    )

  it.each([
    ['wrapped', true],
    ['direct', false]
  ])(
    "a section pane row calls the item's current onClick (%s Primary)",
    async (_, wrapped) => {
      const seen: number[] = []
      const { rerender } = render(app(0, seen, wrapped))
      await flushViewportMeasurement()
      rerender(app(1, seen, wrapped))
      rerender(app(2, seen, wrapped))
      await flushViewportMeasurement()
      await userEvent.click(
        within(sectionPane()!).getByRole('link', { name: 'Button' })
      )
      expect(seen).toEqual([2])
    }
  )

  it.each([
    ['wrapped', true],
    ['direct', false]
  ])(
    "a More row calls the item's current onClick (%s Primary)",
    async (_, wrapped) => {
      const seen: number[] = []
      const { rerender } = render(app(0, seen, wrapped))
      await flushViewportMeasurement()
      rerender(app(1, seen, wrapped))
      rerender(app(2, seen, wrapped))
      await flushViewportMeasurement()
      await userEvent.click(screen.getByRole('button', { name: /More/ }))
      const overflow = document.querySelector<HTMLElement>(
        '[data-slot="navigator-overflow-items"]:not(.max-md\\:hidden)'
      )!
      await userEvent.click(within(overflow).getByRole('link', { name: '/e' }))
      expect(seen).toEqual([2])
    }
  )
})
