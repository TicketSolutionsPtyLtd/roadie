import { type ReactElement, type ReactNode, useEffect, useState } from 'react'

import { renderToString } from 'react-dom/server'
import { expect, test } from 'vitest'
import { server } from 'vitest/browser'

import { hydrationShift } from './hydrationTestUtils'

// Chromium only, as its one caller is: Linux WebKit runs no frames while idle.
const it = test.skipIf(server.browser !== 'chromium')

/** `render(true)` a frame after hydrating, as an effect that measures does. */
function Probe({ render }: { render: (mounted: boolean) => ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => void requestAnimationFrame(() => setMounted(true)), [])
  return render(mounted)
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
    (mounted) => room(box('body'), box('late', mounted ? 40 : 0)),
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

it.each<[string, ReactElement, ReactElement, RegExp]>([
  ['text', <p>Server</p>, <p>Client</p>, /Hydration failed[^]+\+ +Client/],
  ['attribute', <p lang='en' />, <p lang='fr' />, /attributes[^]+lang="fr"/]
])('hydrationShift names the %s that differs', async (_, sent, ui, error) => {
  const found = await hydrationShift(renderToString(sent), ui)
  expect(found.join('\n')).toMatch(error)
})

it('hydrationShift runs inline scripts before it hydrates', async () => {
  const fix = "document.currentScript.previousSibling.textContent = 'Client'"
  const script = <script key='fix' dangerouslySetInnerHTML={{ __html: fix }} />
  const page = (text: string) => [<p key='text'>{text}</p>, script]
  const html = renderToString(page('Server'))
  expect(await hydrationShift(html, <>{page('Client')}</>)).toEqual([])
})
