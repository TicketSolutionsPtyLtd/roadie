import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Navigator } from '.'
import { Badge } from '../Badge'
import { Pane } from '../Pane'
import { flushViewportMeasurement, primaryOf, testBrand } from './testUtils'

function Docs({
  value,
  itemsValue,
  withItems = true
}: {
  value: string
  itemsValue?: string
  withItems?: boolean
}) {
  return (
    <Navigator value={value}>
      <Navigator.Primary aria-label='Docs'>
        {testBrand}
        <Navigator.Item value='/' href='/'>
          Home
          <Navigator.Secondary aria-label='Home pages' root='page'>
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
        <Pane role='detail' current>
          {withItems ? (
            <Navigator.SectionItems value={itemsValue} className='mt-2' />
          ) : null}
        </Pane>
      </Navigator.Content>
    </Navigator>
  )
}

const sectionItems = () =>
  document.querySelector<HTMLElement>('[data-slot="navigator-section-items"]')

describe('Navigator.SectionItems', () => {
  it('renders the active section as grouped rows with descriptions, badges and chevrons', async () => {
    render(<Docs value='/' />)
    await flushViewportMeasurement()
    const list = sectionItems()!
    expect(list).toHaveClass('mt-2')
    expect(within(list).getByText('Reference')).toBeInTheDocument()
    expect(list.querySelectorAll('[data-slot="list-group"]')).toHaveLength(1)
    const installation = within(list).getByRole('link', {
      name: /Installation/
    })
    expect(installation).toHaveAttribute('href', '/overview/installation')
    expect(
      installation.querySelector('[data-slot="list-item-subtitle"]')
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
      within(sectionItems()!).getByRole('link', { name: /Migrating to v2/ })
    ).toHaveAttribute('aria-current', 'page')
    expect(
      within(sectionItems()!).getByRole('link', { name: /Installation/ })
    ).not.toHaveAttribute('aria-current')
  })

  it('renders any section by value', async () => {
    render(<Docs value='/' itemsValue='/components' />)
    await flushViewportMeasurement()
    expect(
      within(sectionItems()!).getByRole('link', { name: /Button/ })
    ).toHaveTextContent('Actions and CTAs')
    expect(within(sectionItems()!).queryByText('Installation')).toBeNull()
  })

  it('renders nothing for an unknown section', async () => {
    render(<Docs value='/' itemsValue='/nowhere' />)
    await flushViewportMeasurement()
    expect(sectionItems()).toBeNull()
  })

  it('keeps description out of the navigation', async () => {
    render(<Docs value='/overview/installation' withItems={false} />)
    await flushViewportMeasurement()
    expect(screen.queryByText('Set up the packages')).toBeNull()
    expect(primaryOf('vertical')).not.toHaveTextContent('Set up the packages')
    expect(primaryOf('horizontal')).not.toHaveTextContent('Set up the packages')
    const pane = document.querySelector<HTMLElement>(
      '[data-navigator-section]'
    )!
    expect(
      within(pane).getByRole('link', { name: /Installation/ })
    ).toBeInTheDocument()
    expect(pane.querySelector('[data-slot="list-item-subtitle"]')).toBeNull()
  })
})
