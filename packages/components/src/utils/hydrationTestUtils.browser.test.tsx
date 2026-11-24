import { type ReactNode, useSyncExternalStore } from 'react'

import { renderToString } from 'react-dom/server'
import { expect, test } from 'vitest'
import { server } from 'vitest/browser'

import { hydrationShift } from './hydrationTestUtils'

// The check counts frames, which Linux WebKit doesn't run while a page is idle.
const it = test.skipIf(server.browser !== 'chromium')

const subscribe = () => () => {}
const onClient = () => true
const onServer = () => false

/** Renders `render(false)` on the server and `render(true)` once hydrated. */
function Probe({ render }: { render: (mounted: boolean) => ReactNode }) {
  return render(useSyncExternalStore(subscribe, onClient, onServer))
}

const box = (slot: string, height = 40, transition?: string) => (
  <div key={slot} data-slot={slot} style={{ height, transition }} />
)
const room = (...slots: ReactNode[]) => (
  <div style={{ height: 120 }}>{slots}</div>
)

it.each<[string, (mounted: boolean) => ReactNode, string[]]>([
  [
    'nothing for a slot that appears in room already there',
    (mounted) => room(box('body'), mounted && box('late')),
    []
  ],
  [
    'a slot pushed down',
    (mounted) => room(mounted && box('late'), box('body')),
    ['body moved 0, 40']
  ],
  [
    'a slot that eases to a new size',
    (mounted) => room(box('body', mounted ? 60 : 40, 'height 300ms ease-in')),
    ['body resized 0, 20']
  ],
  [
    'a slot taken away',
    (mounted) => room(box('body'), !mounted && box('placeholder')),
    ['placeholder was removed']
  ],
  [
    'a page made taller',
    (mounted) => <div>{[box('body'), mounted && box('late')]}</div>,
    ['host resized 0, 40', 'root resized 0, 40']
  ]
])('hydrationShift reports %s', async (_, render, expected) => {
  const ui = <Probe render={render} />
  expect(await hydrationShift(renderToString(ui), ui)).toEqual(expected)
})

it('hydrationShift reports a hydration error', async () => {
  const found = await hydrationShift(
    renderToString(<p data-slot='body'>Server</p>),
    <p data-slot='body'>Client</p>
  )
  expect(found.join('\n')).toMatch(/Hydration failed/)
})
