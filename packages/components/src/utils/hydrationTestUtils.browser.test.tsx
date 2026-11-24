import { type ReactElement, type ReactNode, useEffect, useState } from 'react'

import { renderToString } from 'react-dom/server'
import { expect, test } from 'vitest'
import { server } from 'vitest/browser'

import { type Allowance, hydrationShift } from './hydrationTestUtils'

// Chromium only, as its one caller is: Linux WebKit runs no frames while idle.
const it = test.skipIf(server.browser !== 'chromium')

/** `render(true)` after four re-renders a frame apart, as chained effects do. */
function Probe({ render }: { render: (mounted: boolean) => ReactNode }) {
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (step < 4) requestAnimationFrame(() => setStep(step + 1))
  }, [step])
  return <div data-step={step}>{render(step === 4)}</div>
}

const box = (slot: string, height = 40, transition?: string) => (
  <div key={slot} data-slot={slot} style={{ height, transition }} />
)
const pause = (element: HTMLElement | null) =>
  void element?.animate({ opacity: [0, 1] }, 1000).pause()
const room = (...slots: ReactNode[]) => (
  <div style={{ height: 120 }}>{slots}</div>
)

/** Re-renders each frame until the page's images load, as a lazy island does. */
function Loaded({ children }: { children: ReactNode }) {
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    if ([...document.images].every(({ complete }) => complete)) return
    const next = requestAnimationFrame(() => setFrame(frame + 1))
    return () => cancelAnimationFrame(next)
  }, [frame])
  return <div data-frame={frame}>{children}</div>
}

function Throws(): ReactNode {
  throw new Error('Late')
}

function Ticker() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setTick(tick + 1))
    return () => cancelAnimationFrame(frame)
  }, [tick])
  return <i data-tick={tick} />
}

it.each<[string, (mounted: boolean) => ReactNode, string[]]>([
  [
    'nothing for a slot that appears in room already there',
    (mounted) => room(box('body'), box('late', mounted ? 40 : 0)),
    []
  ],
  [
    'nothing for an animation left paused',
    () => room(box('body'), <div key='paused' ref={pause} />),
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
  ],
  [
    'a page that was empty',
    (mounted) => mounted && box('late'),
    ['host resized 0, 40']
  ],
  [
    'nothing for a slot that moves for ever',
    () => [
      <style key='keys'>{'@keyframes by{to{translate:-9999px}}'}</style>,
      <div
        key='band'
        data-slot='band'
        style={{ height: 40, animation: 'by 9s infinite' }}
      />
    ],
    []
  ],
  [
    'nothing for an image that loads late',
    () => (
      <Loaded key='loaded'>
        {room(<img key='art' src='/late-image.svg' alt='' />, box('body'))}
      </Loaded>
    ),
    []
  ]
])('hydrationShift reports %s', async (_, render, expected) => {
  const ui = <Probe render={render} />
  expect(await hydrationShift(renderToString(ui), ui)).toEqual(expected)
})

it.each<[string, (mounted: boolean) => ReactNode, Allowance, string[]]>([
  [
    'nothing up to its allowance',
    (mounted) => room(mounted && box('late'), box('body')),
    { ticket: 'INNO-1', shift: 42 },
    []
  ],
  [
    'a shift past its allowance',
    (mounted) => room(mounted && box('late'), box('body')),
    { ticket: 'INNO-1', shift: 30 },
    ['body moved 0, 40']
  ],
  [
    'an allowance well over the shift',
    (mounted) => room(mounted && box('late'), box('body')),
    { ticket: 'INNO-1', shift: 60 },
    ['INNO-1: shifts 40px, so lower its allowance']
  ],
  [
    'more slots removed than allowed',
    (mounted) => room(!mounted && [box('a'), box('b')]),
    { ticket: 'INNO-1', shift: 0, removed: 1 },
    ['a was removed', 'b was removed']
  ],
  [
    'nothing for as many slots removed as allowed',
    (mounted) => room(!mounted && [box('a'), box('b')]),
    { ticket: 'INNO-1', shift: 0, removed: 2 },
    []
  ],
  [
    'fewer slots removed than allowed',
    (mounted) => room(!mounted && box('a')),
    { ticket: 'INNO-1', shift: 0, removed: 2 },
    ['INNO-1: removes 1, so lower its allowance']
  ]
])('hydrationShift reports %s', async (_, render, allowance, expected) => {
  const ui = <Probe render={render} />
  const html = renderToString(ui)
  expect(await hydrationShift(html, ui, allowance)).toEqual(expected)
})

it('hydrationShift names an error thrown after hydrating', async () => {
  const ui = <Probe render={(mounted) => mounted && <Throws />} />
  const found = await hydrationShift(renderToString(ui), ui)
  expect(found).toContain('Uncaught Error: Late')
})

it('hydrationShift names what never stops changing', async () => {
  const ui = <Probe render={(mounted) => mounted && <Ticker />} />
  await expect(hydrationShift(renderToString(ui), ui)).rejects.toThrow(
    /Still changing after 20 rounds: .*data-tick/
  )
})

it('hydrationShift names an image that never loads', async () => {
  const html = renderToString(<img src='/stalled-image.svg' alt='' />)
  await expect(hydrationShift(html, <p />)).rejects.toThrow(
    /Still loading: .*stalled-image/
  )
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
