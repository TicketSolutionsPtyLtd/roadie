import { type ReactElement } from 'react'

import { cleanup, render } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { Navigator } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { Pane } from '../Pane'
import { useStylesheet } from '../Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

const frames = (count = 2) =>
  new Promise<void>((settle) => {
    const step = (left: number) =>
      left === 0 ? settle() : requestAnimationFrame(() => step(left - 1))
    step(count)
  })

function frame(width: number, dir = 'ltr') {
  const host = document.createElement('div')
  host.dir = dir
  host.style.width = `${width}px`
  document.body.append(host)
  return host
}

async function serve(ui: ReactElement, width: number) {
  const host = frame(width)
  host.innerHTML = renderToString(ui)
  await frames()
  return host
}

async function hydrate(host: HTMLElement, ui: ReactElement) {
  const root = hydrateRoot(host, ui)
  await frames(4)
  return root
}

const panesOf = (host: HTMLElement) =>
  Array.from(
    host.querySelectorAll<HTMLElement>('[data-slot="pane"][data-stack]')
  )

const onScreen = (pane: HTMLElement) =>
  getComputedStyle(pane).display !== 'none' &&
  getComputedStyle(pane).visibility === 'visible'

const drawn = (pane: HTMLElement, slot: 'pane-back' | 'pane-close') => {
  const cell = pane.querySelector(`[data-slot="${slot}"]`)
  return cell !== null && getComputedStyle(cell).display !== 'none'
}

/** How far a pane sits from where its row would place it at rest. */
const offsetOf = (pane: HTMLElement) => {
  const row = pane.closest<HTMLElement>('[data-slot="navigator-panes"]')!
  const start = parseFloat(getComputedStyle(pane).insetInlineStart)
  return Math.round(
    pane.getBoundingClientRect().left - row.getBoundingClientRect().left - start
  )
}

const moving = (pane: HTMLElement) =>
  pane
    .getAnimations()
    .filter(
      (animation) =>
        Number(animation.effect?.getComputedTiming().duration ?? 0) > 1
    ).length

describe('a lone pane that is not reached', () => {
  const Lone = () => (
    <Navigator value='/a'>
      <Pane reached={false}>Solo</Pane>
    </Navigator>
  )

  it('is on screen in the server HTML, and stays put through hydration', async () => {
    const host = await serve(<Lone />, 600)
    const [pane] = panesOf(host)
    expect(pane).not.toHaveAttribute('data-reached')
    expect(onScreen(pane!)).toBe(true)
    expect(offsetOf(pane!)).toBe(0)

    const root = hydrateRoot(host, <Lone />)
    let slid = 0
    for (let at = 0; at < 6; at += 1) {
      await frames(1)
      slid += moving(pane!)
      expect(offsetOf(pane!)).toBe(0)
    }
    expect(slid).toBe(0)
    expect(onScreen(pane!)).toBe(true)
    root.unmount()
  })
})

describe('an overview with its own backHref', () => {
  const PageFirst = () => (
    <Navigator value='/a'>
      <Pane>
        <Pane.Header backHref='/elsewhere' />
        Page
      </Pane>
    </Navigator>
  )

  it.each([600, 1400])(
    'never draws Back or Close, before or after hydration, at %ipx',
    async (width) => {
      const host = await serve(<PageFirst />, width)
      const [pane] = panesOf(host)
      expect(pane).toHaveAttribute('data-depth', '1')
      expect(onScreen(pane!)).toBe(true)
      expect(drawn(pane!, 'pane-back')).toBe(false)
      expect(drawn(pane!, 'pane-close')).toBe(false)

      const root = await hydrate(host, <PageFirst />)
      expect(onScreen(pane!)).toBe(true)
      expect(drawn(pane!, 'pane-back')).toBe(false)
      expect(drawn(pane!, 'pane-close')).toBe(false)
      root.unmount()
    }
  )
})

describe('declared depths', () => {
  const DeclaredFirst = () => (
    <Navigator value='/a'>
      <Pane column='list'>List</Pane>
      <Pane depth={2}>
        <Pane.Header onBack={() => {}}>
          <Pane.Title>Sub</Pane.Title>
        </Pane.Header>
      </Pane>
      <Pane>
        <Pane.Header onBack={() => {}}>
          <Pane.Title>Detail</Pane.Title>
        </Pane.Header>
      </Pane>
    </Navigator>
  )

  it('tops the stack with the deepest declared depth, wherever it sits', async () => {
    render(<DeclaredFirst />, { container: frame(600) })
    await frames(4)
    const [list, sub, detail] = panesOf(document.body)
    expect(onScreen(sub!)).toBe(true)
    expect(offsetOf(sub!)).toBe(0)
    expect(drawn(sub!, 'pane-back')).toBe(true)
    expect(onScreen(list!)).toBe(false)
    expect(onScreen(detail!)).toBe(false)
    expect(offsetOf(detail!)).toBeLessThan(0)
  })

  const FivePanes = () => (
    <Navigator value='/a'>
      <Pane column='list'>A</Pane>
      <Pane>B</Pane>
      <Pane depth={2}>C</Pane>
      <Pane depth={3} reached={false}>
        D
      </Pane>
      <Pane depth={3}>
        <Pane.Header onBack={() => {}}>
          <Pane.Title>E</Pane.Title>
        </Pane.Header>
      </Pane>
    </Navigator>
  )

  it.each([600, 1400])(
    'covers the row with a reached fifth pane that offers Back, never Close, at %ipx',
    async (width) => {
      render(<FivePanes />, { container: frame(width) })
      await frames(4)
      const fifth = panesOf(document.body)[4]!
      expect(fifth).toHaveAttribute('data-depth', 'deep')
      expect(onScreen(fifth)).toBe(true)
      expect(getComputedStyle(fifth).zIndex).toBe('3')
      expect(offsetOf(fifth)).toBe(0)
      const row = fifth.closest('[data-slot="navigator-panes"]')!
      const inset = 2 * parseFloat(getComputedStyle(fifth).insetInlineEnd)
      expect(
        Math.round(
          row.getBoundingClientRect().width -
            fifth.getBoundingClientRect().width -
            inset
        )
      ).toBe(0)
      expect(drawn(fifth, 'pane-back')).toBe(true)
      expect(drawn(fifth, 'pane-close')).toBe(false)
    }
  )
})

describe('right to left, beside a vertical primary', () => {
  const Expandable = () => (
    <Navigator value='/a'>
      <Navigator.Primary aria-label='Main'>
        <Navigator.Brand>Brand</Navigator.Brand>
        <Navigator.Item value='/a' href='/a'>
          Alpha
        </Navigator.Item>
        <Navigator.Item value='/b' href='/b'>
          Beta
        </Navigator.Item>
      </Navigator.Primary>
      <Pane column='list'>List</Pane>
      <Pane>Detail</Pane>
    </Navigator>
  )

  it('drops the content gutter on the side of the navigation', async () => {
    render(<Expandable />, { container: frame(600, 'rtl') })
    await frames(4)
    const primary = document.querySelector<HTMLElement>(
      '[data-slot="navigator-primary"][data-orientation="vertical"]'
    )!
    const content = document.querySelector<HTMLElement>(
      '[data-slot="navigator-content"]'
    )!
    expect(getComputedStyle(primary).display).not.toBe('none')
    const style = getComputedStyle(content)
    expect(style.marginRight).toBe('-8px')
    expect(style.paddingRight).toBe('8px')
    expect(style.marginLeft).toBe('0px')
    const [, detail] = panesOf(document.body)
    const row = detail!.closest('[data-slot="navigator-panes"]')!
    expect(
      Math.round(
        row.getBoundingClientRect().right -
          detail!.getBoundingClientRect().right
      )
    ).toBe(0)
  })
})
