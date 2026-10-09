import type { CSSProperties, ReactNode } from 'react'

import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import roadieCss from '../../vitest.browser.css?inline'
import { useStylesheet } from '../components/Pane/testUtils'

// Shadows take the hue of the nearest intent. The shadow tokens hold
// var(--intent-hue), which a custom property resolves where it is declared,
// so a token declared only on :root would keep the root hue everywhere.

let removeRoadie = () => {}
beforeAll(() => {
  removeRoadie = useStylesheet(roadieCss)
})
afterAll(() => removeRoadie())
afterEach(() => {
  cleanup()
  document.documentElement.classList.remove('dark')
})

const ROOT_HUE = 247

const INTENTS = [
  ['danger', 28],
  ['success', 185],
  ['warning', 86],
  ['info', 303],
  ['brand-secondary', 42],
  ['brand-orange', 42],
  ['brand-purple', 303]
] as const

const SURFACES = [
  'shadow-md',
  'emphasis-raised',
  'emphasis-floating',
  'inset-shadow-xs',
  'emphasis-sunken',
  'emphasis-field'
] as const

// Only the tinted layers: the rim light and dark mode's inset highlight are
// white. Browsers keep oklch() as authored in the computed value.
function shadowHues(element: Element) {
  const shadow = getComputedStyle(element).boxShadow
  return [...shadow.matchAll(/oklch\(\s*[\d.]+%?\s+[\d.]+\s+([\d.]+)/g)].map(
    ([, hue]) => Number(hue)
  )
}

function renderSurfaces(wrapper: string, own = '') {
  const { container } = render(
    <div className={wrapper}>
      {SURFACES.map((surface) => (
        <div
          key={surface}
          data-surface={surface}
          className={`${surface} ${own}`}
        >
          {surface}
        </div>
      ))}
    </div>
  )
  return (surface: string) =>
    container.querySelector(`[data-surface='${surface}']`)!
}

function expectHue(element: Element, hue: number) {
  const hues = shadowHues(element)
  expect(hues.length).toBeGreaterThan(0)
  for (const found of hues) expect(found).toBeCloseTo(hue, 0)
}

describe.each([
  ['light', false],
  ['dark', true]
] as const)('shadows in %s mode', (_mode, dark) => {
  it.each(SURFACES)('%s takes the root hue outside any intent', (surface) => {
    document.documentElement.classList.toggle('dark', dark)
    expectHue(renderSurfaces('')(surface), ROOT_HUE)
  })

  describe.each(INTENTS)('in intent-%s', (intent, hue) => {
    it.each(SURFACES)('%s takes the hue from an ancestor', (surface) => {
      document.documentElement.classList.toggle('dark', dark)
      expectHue(renderSurfaces(`intent-${intent}`)(surface), hue)
    })

    it.each(SURFACES)('%s takes the hue on its own element', (surface) => {
      document.documentElement.classList.toggle('dark', dark)
      expectHue(renderSurfaces('', `intent-${intent}`)(surface), hue)
    })

    it.each(SURFACES)('%s is neutral again under intent-neutral', (surface) => {
      document.documentElement.classList.toggle('dark', dark)
      const get = renderSurfaces(`intent-${intent}`, 'intent-neutral')
      expectHue(get(surface), ROOT_HUE)
    })
  })
})

describe.each([
  ['light', false],
  ['dark', true]
] as const)('shadows in %s mode also', (_mode, dark) => {
  function renderShadow(tree: (shadow: ReactNode) => ReactNode) {
    document.documentElement.classList.toggle('dark', dark)
    const { container } = render(tree(<div data-probe className='shadow-md' />))
    return container.querySelector('[data-probe]')!
  }

  it('take the nearest intent when intents nest', () => {
    const probe = renderShadow((shadow) => (
      <div className='intent-success'>
        <div className='intent-danger'>{shadow}</div>
      </div>
    ))
    expectHue(probe, 28)
  })

  it('take the accent hue a subtree sets', () => {
    const probe = renderShadow((shadow) => (
      <div style={{ '--accent-hue': 150 } as CSSProperties}>
        <div className='intent-accent'>{shadow}</div>
      </div>
    ))
    expectHue(probe, 150)
  })

  it('take an intent set by a state variant', () => {
    const probe = renderShadow((shadow) => (
      <div aria-invalid='true' className='aria-invalid:intent-danger'>
        {shadow}
      </div>
    ))
    expectHue(probe, 28)
  })

  it('take an intent set by a breakpoint variant only at that width', async () => {
    const tree = (shadow: ReactNode) => (
      <div className='md:intent-danger'>{shadow}</div>
    )
    await page.viewport(1024, 768)
    expectHue(renderShadow(tree), 28)
    cleanup()
    await page.viewport(400, 768)
    expectHue(renderShadow(tree), ROOT_HUE)
    await page.viewport(1920, 1080)
  })

  // These classes contain `intent-` without being an intent.
  it.each([
    'bg-(--intent-4)',
    '[--pane-surface:var(--intent-bg-raised)]',
    'border-[var(--intent-border-subtle)]'
  ])('keep the inherited hue under %s', (className) => {
    const probe = renderShadow((shadow) => (
      <div className='intent-success'>
        <div className={className}>{shadow}</div>
      </div>
    ))
    expectHue(probe, 185)
  })

  it('let a utility on an intent element override a shadow token', () => {
    const probe = renderShadow(() => (
      <div
        data-probe
        className='shadow-md intent-danger [--shadow-md:0_0_0_1px_red]'
      />
    ))
    expect(getComputedStyle(probe).boxShadow).toContain('rgb(255, 0, 0)')
  })
})

// The sheen tokens mix var(--intent-9), which resolves where they are declared.
describe.each([
  ['light', false, '--sheen-shade'],
  ['dark', true, '--sheen-highlight']
] as const)('the shimmer in %s mode', (_mode, dark, token) => {
  const mix = dark ? 34 : 32

  function renderSheen(intent: string) {
    document.documentElement.classList.toggle('dark', dark)
    const { container } = render(
      <div className={intent}>
        <div data-token style={{ backgroundColor: `var(${token})` }} />
        <div
          data-expected
          style={{
            backgroundColor: `color-mix(in oklch, var(--intent-9) ${mix}%, transparent)`
          }}
        />
        <div data-shimmer className='animate-shimmer' />
      </div>
    )
    const color = (selector: string) =>
      getComputedStyle(container.querySelector(selector)!).backgroundColor
    const shimmer = getComputedStyle(
      container.querySelector('[data-shimmer]')!
    ).backgroundImage
    return {
      token: color('[data-token]'),
      expected: color('[data-expected]'),
      shimmer
    }
  }

  it.each(INTENTS)('takes the colour of intent-%s', (intent) => {
    const root = renderSheen('').token
    cleanup()
    const { token, expected, shimmer } = renderSheen(`intent-${intent}`)
    expect(token).toBe(expected)
    expect(token).not.toBe(root)
    expect(shimmer).toContain(token)
  })

  it('keeps the root colour outside any intent', () => {
    const { token, expected } = renderSheen('')
    expect(token).toBe(expected)
  })
})
