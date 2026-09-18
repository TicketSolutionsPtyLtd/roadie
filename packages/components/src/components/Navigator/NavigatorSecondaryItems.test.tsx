import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Navigator, type NavigatorSecondaryItemsProps } from '.'
import { Badge } from '../Badge'
import { Pane } from '../Pane'
import { flushViewportMeasurement, primaryOf, testBrand } from './testUtils'

function Docs({
  value,
  itemsValue,
  withItems = true,
  itemsProps
}: {
  value: string
  itemsValue?: string
  withItems?: boolean
  itemsProps?: Omit<NavigatorSecondaryItemsProps, 'value'>
}) {
  return (
    <Navigator value={value}>
      <Navigator.Primary aria-label='Docs'>
        {testBrand}
        <Navigator.Item value='/' href='/'>
          Home
          <Navigator.Secondary aria-label='Home pages' overview>
            <Navigator.Item
              value='/overview/installation'
              href='/overview/installation'
              description='Set up the packages'
              badge={<Badge>New</Badge>}
            >
              Installation
            </Navigator.Item>
            <Navigator.Group>
              <Navigator.GroupTitle>Reference</Navigator.GroupTitle>
              <Navigator.Item
                value='/migration'
                href='/migration'
                description='Move from v1'
              >
                Migrating to v2
              </Navigator.Item>
            </Navigator.Group>
          </Navigator.Secondary>
        </Navigator.Item>
        <Navigator.Item value='/components' href='/components'>
          Components
          <Navigator.Secondary aria-label='Components'>
            <Navigator.Item
              value='/components/button'
              href='/components/button'
              description='Actions and CTAs'
            >
              Button
            </Navigator.Item>
          </Navigator.Secondary>
        </Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content>
        <Pane>
          {withItems ? (
            <Navigator.SecondaryItems
              value={itemsValue}
              className='mt-2'
              {...itemsProps}
            />
          ) : null}
        </Pane>
      </Navigator.Content>
    </Navigator>
  )
}

const secondaryItems = () =>
  document.querySelector<HTMLElement>('[data-slot="navigator-secondary-items"]')

describe('Navigator.SecondaryItems', () => {
  it('renders the active secondary as grouped rows with descriptions, badges and chevrons', async () => {
    render(<Docs value='/' />)
    await flushViewportMeasurement()
    const list = secondaryItems()!
    expect(list).toHaveClass('mt-2')
    expect(within(list).getByText('Reference')).toBeInTheDocument()
    expect(list.querySelectorAll('[data-slot="list-group"]')).toHaveLength(1)
    const installation = within(list).getByRole('link', {
      name: /Installation/
    })
    expect(installation).toHaveAttribute('href', '/overview/installation')
    expect(
      installation.querySelector('[data-slot="list-item-description"]')
    ).toHaveTextContent('Set up the packages')
    expect(
      installation.querySelector('[data-slot="list-item-chevron"]')
    ).not.toBeNull()
    expect(installation).toHaveTextContent('New')
    expect(
      within(list).getByRole('link', { name: /Migrating to v2/ })
    ).toHaveTextContent('Move from v1')
  })

  it('marks the current row', async () => {
    render(<Docs value='/migration' />)
    await flushViewportMeasurement()
    expect(
      within(secondaryItems()!).getByRole('link', { name: /Migrating to v2/ })
    ).toHaveAttribute('aria-current', 'page')
    expect(
      within(secondaryItems()!).getByRole('link', { name: /Installation/ })
    ).not.toHaveAttribute('aria-current')
  })

  it('renders any secondary by value', async () => {
    render(<Docs value='/' itemsValue='/components' />)
    await flushViewportMeasurement()
    expect(
      within(secondaryItems()!).getByRole('link', { name: /Button/ })
    ).toHaveTextContent('Actions and CTAs')
    expect(within(secondaryItems()!).queryByText('Installation')).toBeNull()
  })

  it('renders nothing for an unknown secondary', async () => {
    render(<Docs value='/' itemsValue='/nowhere' />)
    await flushViewportMeasurement()
    expect(secondaryItems()).toBeNull()
  })

  it('keeps description out of the navigation', async () => {
    render(<Docs value='/overview/installation' withItems={false} />)
    await flushViewportMeasurement()
    expect(screen.queryByText('Set up the packages')).toBeNull()
    expect(primaryOf('vertical')).not.toHaveTextContent('Set up the packages')
    expect(primaryOf('horizontal')).not.toHaveTextContent('Set up the packages')
    const pane = document.querySelector<HTMLElement>(
      '[data-navigator-secondary]'
    )!
    expect(
      within(pane).getByRole('link', { name: /Installation/ })
    ).toBeInTheDocument()
    expect(pane.querySelector('[data-slot="list-item-description"]')).toBeNull()
  })

  it('passes List props through', async () => {
    const { rerender } = render(
      <Docs value='/' itemsProps={{ emphasis: 'normal' }} />
    )
    await flushViewportMeasurement()
    expect(secondaryItems()).toHaveAttribute('data-emphasis', 'normal')
    expect(secondaryItems()).not.toHaveAttribute('data-contained')
    rerender(
      <Docs value='/' itemsProps={{ contained: true, emphasis: 'subtle' }} />
    )
    expect(secondaryItems()).toHaveAttribute('data-contained', 'subtle')
    expect(secondaryItems()).not.toHaveAttribute('data-emphasis')
    expect(secondaryItems()).toHaveAttribute(
      'data-slot',
      'navigator-secondary-items'
    )
  })

  it('never shows a Primary item description on a tile, the bar or More', async () => {
    const user = userEvent.setup()
    render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Docs'>
          {testBrand}
          {['/a', '/b', '/c', '/d', '/e', '/f'].map((v) => (
            <Navigator.Item
              key={v}
              value={v}
              href={v}
              description={`About ${v}`}
            >
              {v}
            </Navigator.Item>
          ))}
        </Navigator.Primary>
        <Navigator.Content />
      </Navigator>
    )
    await flushViewportMeasurement()
    await user.click(
      within(primaryOf('horizontal')).getByRole('button', { name: 'More' })
    )
    const more = document.querySelector<HTMLElement>(
      '[data-slot="navigator-overflow-items"]:not(.max-md\\:hidden)'
    )!
    expect(within(more).getByRole('link', { name: '/f' })).toBeInTheDocument()
    expect(
      within(primaryOf('vertical')).getByRole('link', { name: '/f' })
    ).toBeInTheDocument()
    expect(document.body.innerHTML).not.toContain('About')
  })
})

function StudioApp({ value }: { value: string }) {
  return (
    <Navigator value={value}>
      <Navigator.Primary aria-label='Studio'>
        {testBrand}
        <Navigator.Item value='/studio/events' href='/studio/events'>
          Events
          <Navigator.Secondary aria-label='Events pages' overview>
            <Navigator.Item
              value='/studio/events/a'
              href='/studio/events/a'
              description='First'
            >
              Alpha
            </Navigator.Item>
            <Navigator.Item
              value='/studio/events/b'
              href='/studio/events/b'
              description='Second'
            >
              Beta
            </Navigator.Item>
          </Navigator.Secondary>
        </Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content>
        <Pane>
          <Navigator.SecondaryItems />
        </Pane>
      </Navigator.Content>
    </Navigator>
  )
}

const generatedSecondaryPane = () =>
  document.querySelector<HTMLElement>('[data-navigator-secondary]')

describe('loose rows key warning', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keys loose rows through Navigator.SecondaryItems and the generated secondary pane', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { rerender } = render(<StudioApp value='/studio/events' />)
    await flushViewportMeasurement()
    expect(
      within(secondaryItems()!).getByRole('link', { name: 'Alpha' })
    ).toBeInTheDocument()
    expect(
      within(secondaryItems()!).getByRole('link', { name: 'Beta' })
    ).toBeInTheDocument()

    rerender(<StudioApp value='/studio/events/a' />)
    await flushViewportMeasurement()
    expect(
      within(generatedSecondaryPane()!).getByRole('link', { name: 'Alpha' })
    ).toBeInTheDocument()
    expect(
      within(generatedSecondaryPane()!).getByRole('link', { name: 'Beta' })
    ).toBeInTheDocument()

    expect(error).not.toHaveBeenCalled()
  })
})
