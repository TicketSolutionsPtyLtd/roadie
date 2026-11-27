import type { CSSProperties } from 'react'

import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest'

import { useStylesheet } from '@oztix/roadie-browser-testing/stylesheet'

import roadieCss from '../../vitest.browser.css?inline'

// Every --intent-* an intent sets, pinned per context in a snapshot taken
// before intents.css was rewritten to read its own scale (INNO-1672). Each
// colour token is replaced by its own name, so the snapshot shows which step
// every role reads and stays put when the palette is retuned. A context other
// than the plain intent lists only what differs from the plain intent.

let removeRoadie = () => {}
beforeAll(() => {
  removeRoadie = useStylesheet(roadieCss)
})
afterAll(() => removeRoadie())
afterEach(() => {
  cleanup()
  document.documentElement.classList.remove('dark')
  document.documentElement.removeAttribute('style')
})

const SCALES = [
  'neutral',
  'brand',
  'brand-secondary',
  'accent',
  'danger',
  'success',
  'warning',
  'info'
]

// tokens.css declares the neutral and accent scales again on a scope, for
// its own accent, and every scale again on a .dark element, so each gets its
// own names for the scales it declares.
function tokenNames(prefix = '', own = /^(neutral|accent)$/) {
  const names: Record<string, string> = {}
  for (const scale of SCALES) {
    const name = prefix && own.test(scale) ? prefix + scale : scale
    for (let step = 0; step <= 13; step++) {
      names[`--color-${scale}-${step}`] = `${name}-${step}`
      names[`--color-${scale}-light-${step}`] = `${name}-light-${step}`
    }
  }
  return names
}

// Tailwind only builds the classes it finds written out in full.
const INTENTS = [
  ['neutral', '[&_.probe]:intent-neutral', 'data-[checked]:intent-neutral'],
  ['brand', '[&_.probe]:intent-brand', 'data-[checked]:intent-brand'],
  [
    'brand-secondary',
    '[&_.probe]:intent-brand-secondary',
    'data-[checked]:intent-brand-secondary'
  ],
  [
    'brand-purple',
    '[&_.probe]:intent-brand-purple',
    'data-[checked]:intent-brand-purple'
  ],
  [
    'brand-blue',
    '[&_.probe]:intent-brand-blue',
    'data-[checked]:intent-brand-blue'
  ],
  [
    'brand-orange',
    '[&_.probe]:intent-brand-orange',
    'data-[checked]:intent-brand-orange'
  ],
  ['accent', '[&_.probe]:intent-accent', 'data-[checked]:intent-accent'],
  ['danger', '[&_.probe]:intent-danger', 'data-[checked]:intent-danger'],
  ['success', '[&_.probe]:intent-success', 'data-[checked]:intent-success'],
  ['warning', '[&_.probe]:intent-warning', 'data-[checked]:intent-warning'],
  ['info', '[&_.probe]:intent-info', 'data-[checked]:intent-info']
] as const

function intentProperties() {
  const found = new Set<string>()
  const visit = (rules: CSSRuleList) => {
    for (const rule of rules) {
      if ('style' in rule)
        for (const property of (rule as CSSStyleRule).style)
          if (property.startsWith('--intent-')) found.add(property)
      if ('cssRules' in rule) visit((rule as CSSGroupingRule).cssRules)
    }
  }
  for (const sheet of document.styleSheets) visit(sheet.cssRules)
  return [...found].sort()
}

// Engines differ only in the spaces they keep around substituted tokens.
const normalise = (value: string) =>
  value
    .replace(/\s+/g, ' ')
    .replace(/\s*([(),])\s*/g, '$1')
    .trim()

function resolved(element: Element, properties: string[]) {
  const style = getComputedStyle(element)
  return Object.fromEntries(
    properties.map((p) => [p, normalise(style.getPropertyValue(p))])
  )
}

function Contexts() {
  return (
    <>
      <div
        data-case='scope'
        data-accent-scope=''
        style={
          { ...tokenNames('scope-'), '--accent-hue': '140' } as CSSProperties
        }
      >
        {INTENTS.map(([intent]) => (
          <div
            key={intent}
            data-case={`scope .intent-${intent}`}
            className={`intent-${intent}`}
          />
        ))}
      </div>
      <div data-case='.dark' className='dark' style={tokenNames('dark-', /./)}>
        {INTENTS.map(([intent]) => (
          <div
            key={intent}
            data-case={`.dark .intent-${intent}`}
            className={`intent-${intent}`}
          />
        ))}
      </div>
      {INTENTS.map(([intent, descendant, state]) => (
        <div key={intent}>
          <div data-case={`.intent-${intent}`} className={`intent-${intent}`} />
          <div className='intent-danger'>
            <div
              data-case={`.intent-danger .intent-${intent}`}
              className={`intent-${intent}`}
            />
          </div>
          <div className={descendant}>
            <div data-case={descendant} className='probe' />
          </div>
          <div data-case={state} data-checked='' className={state} />
        </div>
      ))}
    </>
  )
}

it('resolves every --intent-* as before, in each context and theme', () => {
  const properties = intentProperties()
  const html = document.documentElement
  for (const [name, value] of Object.entries(tokenNames()))
    html.style.setProperty(name, value)
  const { container } = render(<Contexts />)
  const plainCase = (label: string) =>
    label.match(/(intent-[\w-]+)$/)?.[1] ?? ''

  const lines: string[] = []
  for (const theme of ['light', 'dark']) {
    html.classList.toggle('dark', theme === 'dark')
    const values = new Map([[':root', resolved(html, properties)]])
    for (const element of container.querySelectorAll('[data-case]'))
      values.set(
        element.getAttribute('data-case')!,
        resolved(element, properties)
      )
    for (const [label, own] of values) {
      const plain =
        label === `.${plainCase(label)}` || label === ':root'
          ? undefined
          : values.get(`.${plainCase(label)}`)
      lines.push(`${theme} ${label}`)
      for (const p of properties)
        if (!plain || plain[p] !== own[p]) lines.push(`  ${p}: ${own[p]}`)
    }
  }
  expect(properties.length).toBeGreaterThan(40)
  return expect(`${lines.join('\n')}\n`).toMatchFileSnapshot(
    './__snapshots__/intentScale.txt'
  )
})
