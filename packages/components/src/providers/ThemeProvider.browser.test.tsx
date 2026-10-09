import type { ReactNode } from 'react'
import { act } from 'react'

import { cleanup, render } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { getOklchHue } from '@oztix/roadie-core/colors'

import roadieCss from '../../vitest.browser.css?inline'
import { Dialog } from '../components/Dialog'
import { Drawer } from '../components/Drawer'
import { Menu } from '../components/Menu'
import { useStylesheet } from '../components/Pane/testUtils'
import { Popover } from '../components/Popover'
import { Tooltip } from '../components/Tooltip'
import { ThemeProvider, getAccentStyleSync } from './ThemeProvider'

const ROOT = '#0091EB'
const ROUTE = '#7C3AED'
const ROOT_HUE = 247
const ROUTE_HUE = 293

let removeRoadie = () => {}
beforeAll(() => {
  removeRoadie = useStylesheet(roadieCss)
})
afterAll(() => removeRoadie())
afterEach(() => {
  cleanup()
  document.getElementById('roadie-accent-theme')?.remove()
  document.documentElement.classList.remove('dark')
})

// Settles an accent effect that awaits the async hue before it writes.
const settle = () => act(async () => void (await getOklchHue(ROUTE)))

// Browsers keep oklch() as authored in the computed value.
function hueOf(element: Element, property: 'backgroundColor' | 'color') {
  const value = getComputedStyle(element)[property]
  const hue = value.match(/oklch\(\s*[\d.]+%?\s+[\d.]+\s+([\d.]+)/)?.[1]
  if (hue === undefined) throw new Error(`No oklch hue in ${value}`)
  return Math.round(Number(hue))
}

function Probes({ name }: { name: string }) {
  return (
    <>
      <div data-probe={`${name}-accent`} className='bg-strong intent-accent' />
      <div data-probe={`${name}-neutral`} className='bg-normal text-normal' />
      <div data-probe={`${name}-shadow`} className='shadow-md' />
    </>
  )
}

const probe = (name: string) => document.querySelector(`[data-probe=${name}]`)!

function expectHues(name: string, hue: number) {
  expect(hueOf(probe(`${name}-accent`), 'backgroundColor')).toBe(hue)
  expect(hueOf(probe(`${name}-neutral`), 'backgroundColor')).toBe(hue)
  expect(hueOf(probe(`${name}-neutral`), 'color')).toBe(hue)
  expect(getComputedStyle(probe(`${name}-shadow`)).boxShadow).toContain(
    ` ${hue}`
  )
}

function Page({ route }: { route: boolean }) {
  return (
    <ThemeProvider accentColor={ROOT}>
      <Probes name='outside' />
      {route && (
        <ThemeProvider accentColor={ROUTE}>
          <Probes name='inside' />
        </ThemeProvider>
      )}
    </ThemeProvider>
  )
}

describe.each([false, true])('a nested ThemeProvider, dark %s', (dark) => {
  it('themes its own subtree and not a sibling outside it', async () => {
    document.documentElement.classList.toggle('dark', dark)
    render(<Page route />)
    await settle()
    expectHues('inside', ROUTE_HUE)
    expectHues('outside', ROOT_HUE)
  })

  it('leaves the root accent in place after it unmounts', async () => {
    document.documentElement.classList.toggle('dark', dark)
    const { rerender } = render(<Page route={false} />)
    await settle()
    rerender(<Page route />)
    await settle()
    expectHues('outside', ROOT_HUE)
    rerender(<Page route={false} />)
    await settle()
    expectHues('outside', ROOT_HUE)
  })
})

describe('hydrating over server-rendered accents', () => {
  function serve(tree: ReactNode, accent: string) {
    const style = document.createElement('style')
    style.id = 'roadie-accent-theme'
    style.textContent = getAccentStyleSync(accent)
    document.head.append(style)
    const container = document.createElement('div')
    container.innerHTML = renderToString(tree)
    document.body.append(container)
    return { style, container }
  }

  it('paints the server accents before hydration and keeps the style tag', async () => {
    const tree = (
      <ThemeProvider accentColor={ROUTE}>
        <Probes name='outside' />
        <ThemeProvider accentColor={ROOT}>
          <Probes name='inside' />
        </ThemeProvider>
      </ThemeProvider>
    )
    const { style, container } = serve(tree, ROUTE)
    const css = style.textContent
    const mutations: MutationRecord[] = []
    const observer = new MutationObserver((records) =>
      mutations.push(...records)
    )
    observer.observe(style, {
      childList: true,
      characterData: true,
      subtree: true
    })

    expectHues('outside', ROUTE_HUE)
    expectHues('inside', ROOT_HUE)

    const recovered: unknown[] = []
    const root = await act(async () =>
      hydrateRoot(container, tree, {
        onRecoverableError: (error) => recovered.push(error)
      })
    )
    await settle()

    expect(recovered).toEqual([])

    mutations.push(...observer.takeRecords())
    observer.disconnect()
    expect(mutations).toEqual([])
    expect(document.getElementById('roadie-accent-theme')).toBe(style)
    expect(style.textContent).toBe(css)
    expectHues('outside', ROUTE_HUE)
    expectHues('inside', ROOT_HUE)

    act(() => root.unmount())
    container.remove()
  })
})

describe('a nested ThemeProvider inside other scopes', () => {
  const INNER = '#16A34A'
  const INNER_HUE = 149

  it('themes a scope inside a scope by the innermost accent', async () => {
    render(
      <ThemeProvider accentColor={ROOT}>
        <Probes name='outside' />
        <ThemeProvider accentColor={ROUTE}>
          <Probes name='inside' />
          <ThemeProvider accentColor={INNER}>
            <Probes name='innermost' />
          </ThemeProvider>
        </ThemeProvider>
      </ThemeProvider>
    )
    await settle()
    expectHues('outside', ROOT_HUE)
    expectHues('inside', ROUTE_HUE)
    expectHues('innermost', INNER_HUE)
  })

  it('starts its subtree at the neutral intent and keeps an intent set inside', async () => {
    render(
      <ThemeProvider accentColor={ROOT}>
        <div className='intent-danger'>
          <div data-probe='outside-danger' className='bg-strong' />
          <ThemeProvider accentColor={ROUTE}>
            <Probes name='inside' />
            <div
              data-probe='inside-danger'
              className='bg-strong intent-danger'
            />
          </ThemeProvider>
        </div>
      </ThemeProvider>
    )
    await settle()
    expectHues('inside', ROUTE_HUE)
    expect(hueOf(probe('inside-danger'), 'backgroundColor')).toBe(
      hueOf(probe('outside-danger'), 'backgroundColor')
    )
  })

  it("keeps an app's override of a fixed scale inside a scope", async () => {
    const removeOverride = useStylesheet(
      ':root { --color-danger-10: oklch(0.5 0.2 100) }'
    )
    render(
      <ThemeProvider accentColor={ROOT}>
        <ThemeProvider accentColor={ROUTE}>
          <div data-probe='inside-danger' className='bg-strong intent-danger' />
        </ThemeProvider>
      </ThemeProvider>
    )
    await settle()
    expect(hueOf(probe('inside-danger'), 'backgroundColor')).toBe(100)
    removeOverride()
  })

  it.each<[string, ReactNode]>([
    [
      'Dialog',
      <Dialog open>
        <Dialog.Content>
          <Probes name='inside' />
        </Dialog.Content>
      </Dialog>
    ],
    [
      'Drawer',
      <Drawer open>
        <Drawer.Content>
          <Probes name='inside' />
        </Drawer.Content>
      </Drawer>
    ],
    [
      'Popover',
      <Popover open>
        <Popover.Trigger>Open</Popover.Trigger>
        <Popover.Content>
          <Probes name='inside' />
        </Popover.Content>
      </Popover>
    ],
    [
      'Menu',
      <Menu open>
        <Menu.Trigger>Open</Menu.Trigger>
        <Menu.Content>
          <Probes name='inside' />
        </Menu.Content>
      </Menu>
    ],
    [
      'Tooltip',
      <Tooltip open>
        <Tooltip.Trigger>Open</Tooltip.Trigger>
        <Tooltip.Content>
          <Probes name='inside' />
        </Tooltip.Content>
      </Tooltip>
    ]
  ])('themes a portalled %s by the scope it opens from', async (_, popup) => {
    render(
      <ThemeProvider accentColor={ROOT}>
        <ThemeProvider accentColor={ROUTE}>{popup}</ThemeProvider>
      </ThemeProvider>
    )
    await settle()
    expectHues('inside', ROUTE_HUE)
  })
})

describe('a nested ThemeProvider in layout', () => {
  const boxes = (selector: string) =>
    Array.from(document.querySelectorAll(selector), (element) => {
      const { left, top, width, height } = element.getBoundingClientRect()
      return [left, top, width, height].map(Math.round)
    })

  function Cells({ scoped }: { scoped: boolean }) {
    const middle = <div data-cell className='h-6 flex-1' />
    return (
      <>
        <div data-cell className='h-6 flex-1' />
        {scoped ? (
          <ThemeProvider accentColor={ROUTE}>{middle}</ThemeProvider>
        ) : (
          middle
        )}
        <div data-cell className='h-6 flex-1' />
      </>
    )
  }

  it.each([
    ['a grid', 'grid grid-cols-3 gap-4'],
    ['a flex row', 'flex gap-4'],
    ['a flex column', 'flex flex-col gap-4']
  ])(
    'lays out a scoped child of %s like an unscoped one',
    async (_, layout) => {
      const page = (scoped: boolean) => (
        <ThemeProvider accentColor={ROOT}>
          <div className={layout} style={{ width: 600 }}>
            <Cells scoped={scoped} />
          </div>
        </ThemeProvider>
      )
      const { rerender } = render(page(false))
      const plain = boxes('[data-cell]')
      rerender(page(true))
      await settle()
      expect(boxes('[data-cell]')).toEqual(plain)
    }
  )

  it('lays out a scoped list item like an unscoped one', async () => {
    const page = (scoped: boolean) => (
      <ThemeProvider accentColor={ROOT}>
        <ul className='grid list-disc gap-2 pl-8' style={{ width: 600 }}>
          <li>One</li>
          {scoped ? (
            <ThemeProvider accentColor={ROUTE}>
              <li>Two</li>
            </ThemeProvider>
          ) : (
            <li>Two</li>
          )}
        </ul>
      </ThemeProvider>
    )
    const { rerender } = render(page(false))
    const plain = boxes('li')
    rerender(page(true))
    await settle()
    expect(boxes('li')).toEqual(plain)
  })
})
