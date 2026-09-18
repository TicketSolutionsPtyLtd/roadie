import { createElement } from 'react'

import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Navigator } from '.'
import { List } from '../List'
import { Pane } from '../Pane'
import { NavigatorOverflowPane } from './NavigatorOverflowPane'
import { markCurrent } from './NavigatorPageStep'
import {
  FakeIcon,
  flushViewportMeasurement,
  testBrand,
  withStubLink
} from './testUtils'

const upgrades = { constructed: 0, connected: 0 }
class LivePlayer extends HTMLElement {
  constructor() {
    super()
    upgrades.constructed += 1
  }
  connectedCallback() {
    upgrades.connected += 1
  }
}
if (!customElements.get('live-player')) {
  customElements.define('live-player', LivePlayer)
}

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
          <Navigator.Secondary aria-label='Home pages' overview>
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
        <Pane>
          {value === '/' ? (
            <div id='home' data-testid='home'>
              <form id='search'>
                <input name='query' />
              </form>
              <input form='search' data-testid='outside' />
              <div
                dangerouslySetInnerHTML={{
                  __html:
                    '<img alt="" src="data:," onerror="void 0"><script>void 0</script>'
                }}
              />
              <iframe title='embed' className='aspect-video' />
              <canvas className='chart' />
              {createElement('live-player', { className: 'player' })}
              <Navigator.SecondaryItems />
            </div>
          ) : (
            <p data-testid='page'>The page at {value}</p>
          )}
        </Pane>
        {showMore === undefined ? null : (
          <NavigatorOverflowPane aria-label='More'>
            <p>More</p>
          </NavigatorOverflowPane>
        )}
      </Navigator.Content>
    </Navigator>
  )
}

const row = () =>
  document.querySelector<HTMLElement>('[data-slot="navigator-panes"]')!
const ghost = () =>
  document.querySelector<HTMLElement>('[data-slot="navigator-page-ghost"]')!

// What the stacked tier of the pane columns sheet does to a stack pane.
const stacked = document.createElement('style')
stacked.textContent =
  '[data-slot="pane"][data-stack] { position: absolute !important; }'

let finish: () => void = () => {}
let wasGetAnimations: typeof Element.prototype.getAnimations
const setReducedMotion = (value: boolean) =>
  (
    globalThis as unknown as { __setReducedMotion?: (v: boolean) => void }
  ).__setReducedMotion?.(value)

beforeEach(() => {
  const finished = new Promise<void>((resolve) => {
    finish = resolve
  })
  // Put back, never deleted: Base UI reads it from a timer that outlives the test.
  wasGetAnimations = Element.prototype.getAnimations
  Element.prototype.getAnimations = vi.fn(function (this: Element) {
    return this.matches('[data-slot="navigator-page-ghost"]:not(:empty)')
      ? [{ finished } as unknown as Animation]
      : []
  })
  document.head.append(stacked)
})

afterEach(() => {
  Element.prototype.getAnimations = wasGetAnimations
  stacked.remove()
  setReducedMotion(false)
  vi.restoreAllMocks()
})

async function navigate(from: string, to: string) {
  const view = render(<Docs value={from} />)
  await flushViewportMeasurement()
  view.rerender(<Docs value={to} />)
  await flushViewportMeasurement()
  return view
}

describe('a destination with an overview', () => {
  it('pushes a sub-page over a ghost of the page it leaves, from the keyframes', async () => {
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
    expect(row().style.getPropertyValue('--page-step-ghost-from')).toBe('')
    expect(row().style.getPropertyValue('--page-step-pane-from')).toBe('')
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

  it('makes no ghost where panes sit in columns', async () => {
    stacked.remove()
    const importNode = vi.spyOn(Document.prototype, 'importNode')
    await navigate('/', '/overview/installation')
    expect(importNode).not.toHaveBeenCalled()
    expect(row()).not.toHaveAttribute('data-page-step')
    expect(ghost()).toBeEmptyDOMElement()
  })

  it('makes no ghost with reduced motion', async () => {
    setReducedMotion(true)
    const importNode = vi.spyOn(Document.prototype, 'importNode')
    await navigate('/', '/overview/installation')
    expect(importNode).not.toHaveBeenCalled()
    expect(row()).not.toHaveAttribute('data-page-step')
  })

  it('leaves nothing in the ghost to collide with the real page', async () => {
    await navigate('/', '/overview/installation')
    expect(ghost().querySelector('[data-testid="home"]')).not.toBeNull()
    for (const attribute of ['id', 'name', 'form', 'onerror']) {
      expect(ghost().querySelector(`[${attribute}]`)).toBeNull()
    }
    expect(ghost().querySelector('script')).toBeNull()
  })

  it('stands in for anything that runs or draws once connected', async () => {
    const view = render(<Docs value='/' />)
    await flushViewportMeasurement()
    const counted = { ...upgrades }
    view.rerender(<Docs value='/overview/installation' />)
    await flushViewportMeasurement()
    expect(upgrades).toEqual(counted)
    for (const tag of ['iframe', 'canvas', 'live-player']) {
      expect(ghost().querySelector(tag)).toBeNull()
    }
    for (const kept of ['.aspect-video', '.chart', '.player']) {
      expect(ghost().querySelector(kept)).not.toBeNull()
    }
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

  it('pops from where a push had reached', async () => {
    const view = await navigate('/', '/overview/installation')
    view.rerender(<Docs value='/' />)
    await flushViewportMeasurement()
    expect(row()).toHaveAttribute('data-page-step', 'pop')
    expect(ghost().children).toHaveLength(1)
    expect(ghost()).toHaveTextContent('The page at /overview/installation')
    expect(row().style.getPropertyValue('--page-step-ghost-from')).not.toBe('')
    expect(row().style.getPropertyValue('--page-step-pane-from')).not.toBe('')
  })

  it('clears the ghost when Navigator unmounts mid-step', async () => {
    const view = await navigate('/', '/overview/installation')
    const panes = row()
    const host = ghost()
    view.unmount()
    expect(panes).not.toHaveAttribute('data-page-step')
    expect(host).toBeEmptyDOMElement()
    await act(async () => finish())
  })

  it.each([
    ['a sibling', '/overview/installation', '/overview/philosophy'],
    ['a destination switch', '/', '/components/button'],
    ['no overview', '/components', '/components/button']
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

  describe('drops a step still sliding', () => {
    it('when More opens', async () => {
      const view = render(<Docs value='/' showMore={false} />)
      await flushViewportMeasurement()
      view.rerender(<Docs value='/overview/installation' showMore={false} />)
      await flushViewportMeasurement()
      expect(row()).toHaveAttribute('data-page-step', 'push')
      view.rerender(<Docs value='/overview/installation' showMore />)
      await flushViewportMeasurement()
      expect(row()).toHaveAttribute('data-overflow')
      expect(row()).not.toHaveAttribute('data-page-step')
      expect(ghost()).toBeEmptyDOMElement()
    })

    it('when the list shows over the sub-page', async () => {
      const view = await navigate('/', '/overview/installation')
      expect(row()).toHaveAttribute('data-page-step', 'push')
      view.rerender(<Docs value='/overview/installation' showList />)
      await flushViewportMeasurement()
      expect(row()).toHaveAttribute('data-reveal')
      expect(row()).not.toHaveAttribute('data-page-step')
      expect(ghost()).toBeEmptyDOMElement()
    })

    it('when the destination changes', async () => {
      const view = await navigate('/overview/installation', '/')
      expect(row()).toHaveAttribute('data-page-step', 'pop')
      view.rerender(<Docs value='/components/button' />)
      await flushViewportMeasurement()
      expect(row()).not.toHaveAttribute('data-page-step')
      expect(ghost()).toBeEmptyDOMElement()
    })
  })
})

describe('markCurrent', () => {
  it('gives a row exactly the look List.Item gives a current one', () => {
    render(
      <List>
        <List.Item title='Picked' href='/picked' current='page' />
        <List.Item title='Other' href='/other' />
      </List>
    )
    const [current, other] = document.querySelectorAll(
      '[data-slot="list-item"]'
    )
    markCurrent(other!)
    expect(new Set(other!.classList)).toEqual(new Set(current!.classList))
    expect(other).toHaveAttribute('aria-current', 'page')
  })
})

describe('nothing but an overview step gets a copy', () => {
  const listRoot = (value: string, deep: boolean) => (
    <Navigator value={value}>
      <Navigator.Primary aria-label='Main'>
        {testBrand}
        <Navigator.Item value='/s' href='/s' icon={<FakeIcon />}>
          Secondary
          <Navigator.Secondary aria-label='Secondary pages'>
            <Navigator.Item value='/s/a' href='/s/a'>
              A
            </Navigator.Item>
          </Navigator.Secondary>
        </Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content>
        <Pane column='list' depth={0}>
          List
        </Pane>
        <Pane depth={1}>Detail</Pane>
        {deep ? <Pane depth={2}>Deeper</Pane> : null}
      </Navigator.Content>
    </Navigator>
  )

  it('leaves a list-root push and pop alone', async () => {
    const view = render(withStubLink(listRoot('/s/a', false)))
    await flushViewportMeasurement()
    view.rerender(withStubLink(listRoot('/s/a', true)))
    await flushViewportMeasurement()
    expect(ghost()).toBeEmptyDOMElement()
    expect(row()).not.toHaveAttribute('data-page-step')

    view.rerender(withStubLink(listRoot('/s/a', false)))
    await flushViewportMeasurement()
    expect(ghost()).toBeEmptyDOMElement()
    expect(row()).not.toHaveAttribute('data-page-step')
  })

  it('leaves a swap between two sub-pages of an overview alone', async () => {
    await navigate('/overview/philosophy', '/overview/getting-started')
    expect(ghost()).toBeEmptyDOMElement()
    expect(row()).not.toHaveAttribute('data-page-step')
  })
})
