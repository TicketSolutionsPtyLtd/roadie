import type { ReactNode } from 'react'
import { act } from 'react'

import { cleanup, render } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { getOklchHue } from '@oztix/roadie-core/colors'

import roadieCss from '../../vitest.browser.css?inline'
import { useStylesheet } from '../components/Pane/testUtils'
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
