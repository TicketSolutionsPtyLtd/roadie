import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Navigator } from '.'
import { Pane } from '../Pane'
import { flushViewportMeasurement, testBrand } from './testUtils'

function Docs({
  value,
  showList,
  showMore
}: {
  value: string
  showList?: boolean
  showMore?: boolean
}) {
  return (
    <Navigator
      value={value}
      showList={showList}
      onShowListChange={() => {}}
      showMore={showMore}
      onShowMoreChange={() => {}}
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
          <Navigator.Secondary aria-label='Components'>
            <Navigator.Item
              value='/components/button'
              href='/components/button'
            >
              Button
            </Navigator.Item>
          </Navigator.Secondary>
        </Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content>
        <Pane role='detail' current>
          {value === '/' ? (
            <div id='home' data-testid='home'>
              <input name='query' />
              <iframe title='embed' className='aspect-video' />
              <Navigator.SectionItems />
            </div>
          ) : (
            <p data-testid='page'>The page at {value}</p>
          )}
        </Pane>
        {showMore === undefined ? null : (
          <Navigator.OverflowPane aria-label='More'>
            <p>More</p>
          </Navigator.OverflowPane>
        )}
      </Navigator.Content>
    </Navigator>
  )
}

const row = () =>
  document.querySelector<HTMLElement>('[data-slot="navigator-panes"]')!
const ghost = () =>
  document.querySelector<HTMLElement>('[data-slot="navigator-page-ghost"]')!

let finish: () => void = () => {}
let animating = true

beforeEach(() => {
  animating = true
  const finished = new Promise<void>((resolve) => {
    finish = resolve
  })
  Element.prototype.getAnimations = vi.fn(function (this: Element) {
    return animating && this.matches('[data-slot="navigator-page-ghost"]')
      ? [{ finished } as unknown as Animation]
      : []
  })
})

afterEach(() => {
  delete (Element.prototype as Partial<Element>).getAnimations
})

async function navigate(from: string, to: string) {
  const view = render(<Docs value={from} />)
  await flushViewportMeasurement()
  view.rerender(<Docs value={to} />)
  await flushViewportMeasurement()
  return view
}

describe('a page-root section', () => {
  it('pushes a sub-page over a ghost of the page it leaves', async () => {
    await navigate('/', '/overview/installation')
    expect(row()).toHaveAttribute('data-page-step', 'push')
    const page = ghost().firstElementChild as HTMLElement
    expect(page).toHaveAttribute('data-slot', 'pane')
    expect(page).toHaveTextContent('Installation')
    expect(page).not.toHaveAttribute('data-stack')
    expect(page).not.toHaveAttribute('data-stack-position')
    expect(ghost()).toHaveAttribute('aria-hidden', 'true')
    expect(ghost()).toHaveAttribute('inert')
    expect(document.querySelector('[data-testid="page"]')).toBeInTheDocument()
  })

  it('pops back to the page from under a ghost of the sub-page', async () => {
    await navigate('/overview/installation', '/')
    expect(row()).toHaveAttribute('data-page-step', 'pop')
    expect(ghost()).toHaveTextContent('The page at /overview/installation')
    expect(document.querySelector('[data-testid="home"]')).toBeInTheDocument()
  })

  it('clears the ghost once it has slid', async () => {
    await navigate('/', '/overview/installation')
    await act(async () => finish())
    expect(row()).not.toHaveAttribute('data-page-step')
    expect(ghost()).toBeEmptyDOMElement()
  })

  it('draws no ghost where nothing animates, in columns or with reduced motion', async () => {
    animating = false
    await navigate('/', '/overview/installation')
    expect(row()).not.toHaveAttribute('data-page-step')
    expect(ghost()).toBeEmptyDOMElement()
  })

  it('leaves no ids, form names or embeds to collide with the real page', async () => {
    await navigate('/', '/overview/installation')
    expect(ghost().querySelector('[id]')).toBeNull()
    expect(ghost().querySelector('[name]')).toBeNull()
    expect(ghost().querySelector('iframe')).toBeNull()
    expect(ghost().querySelector('.aspect-video')).not.toBeNull()
  })

  it('shows the picked row current, as the list pane does', async () => {
    await navigate('/', '/overview/philosophy')
    const rows = ghost().querySelectorAll('[data-slot="list-item"]')
    expect(rows[1]).toHaveAttribute('aria-current', 'page')
    expect(rows[1]).toHaveClass('intent-accent', 'emphasis-subtle')
    expect(rows[1]).not.toHaveClass('emphasis-subtler')
    expect(rows[0]).not.toHaveAttribute('aria-current')
  })

  it('keeps the page where it was scrolled', async () => {
    const view = render(<Docs value='/' />)
    await flushViewportMeasurement()
    const viewport = document.querySelector<HTMLElement>(
      '[data-stack-position="top"] [data-slot="pane-viewport"]'
    )!
    viewport.scrollTop = 240
    view.rerender(<Docs value='/overview/installation' />)
    await flushViewportMeasurement()
    expect(
      ghost().querySelector<HTMLElement>('[data-slot="pane-viewport"]')!
        .scrollTop
    ).toBe(240)
  })

  it.each([
    ['a sibling', '/overview/installation', '/overview/philosophy'],
    ['a section switch', '/', '/components/button'],
    ['a list root', '/components', '/components/button']
  ])('stays instant for %s', async (_, from, to) => {
    await navigate(from, to)
    expect(row()).not.toHaveAttribute('data-page-step')
    expect(ghost()).toBeEmptyDOMElement()
  })

  it('stays instant from a list shown over the sub-page', async () => {
    const view = render(<Docs value='/overview/installation' showList />)
    await flushViewportMeasurement()
    view.rerender(<Docs value='/' showList />)
    await flushViewportMeasurement()
    expect(row()).not.toHaveAttribute('data-page-step')
  })

  it('stays instant while More is open', async () => {
    const view = render(<Docs value='/' showMore />)
    await flushViewportMeasurement()
    expect(row()).toHaveAttribute('data-overflow')
    view.rerender(<Docs value='/overview/installation' showMore />)
    await flushViewportMeasurement()
    expect(row()).not.toHaveAttribute('data-page-step')
    expect(ghost()).toBeEmptyDOMElement()
  })
})
