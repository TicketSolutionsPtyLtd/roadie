import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { useStylesheet } from '@oztix/roadie-browser-testing/stylesheet'

import roadieCss from '../../vitest.browser.css?inline'

let removeRoadie = () => {}
beforeAll(() => {
  removeRoadie = useStylesheet(roadieCss)
})
afterAll(() => removeRoadie())
afterEach(() => {
  cleanup()
  document.documentElement.classList.remove('dark')
})

// tokens.css registers the raw scales as `@theme inline reference`, so the
// utilities exist while the app's sheet carries no copy of the tokens. Each
// one has to resolve to the token tokens.css declares, in either theme.
// Tailwind only builds the classes it finds written out in full.
const EVERY_STEP = [
  'bg-neutral-0 bg-neutral-1 bg-neutral-2 bg-neutral-3 bg-neutral-4 bg-neutral-5 bg-neutral-6 bg-neutral-7 bg-neutral-8 bg-neutral-9 bg-neutral-10 bg-neutral-11 bg-neutral-12 bg-neutral-13',
  'bg-brand-0 bg-brand-1 bg-brand-2 bg-brand-3 bg-brand-4 bg-brand-5 bg-brand-6 bg-brand-7 bg-brand-8 bg-brand-9 bg-brand-10 bg-brand-11 bg-brand-12 bg-brand-13',
  'bg-accent-0 bg-accent-1 bg-accent-2 bg-accent-3 bg-accent-4 bg-accent-5 bg-accent-6 bg-accent-7 bg-accent-8 bg-accent-9 bg-accent-10 bg-accent-11 bg-accent-12 bg-accent-13',
  'bg-danger-0 bg-danger-1 bg-danger-2 bg-danger-3 bg-danger-4 bg-danger-5 bg-danger-6 bg-danger-7 bg-danger-8 bg-danger-9 bg-danger-10 bg-danger-11 bg-danger-12 bg-danger-13',
  'bg-success-0 bg-success-1 bg-success-2 bg-success-3 bg-success-4 bg-success-5 bg-success-6 bg-success-7 bg-success-8 bg-success-9 bg-success-10 bg-success-11 bg-success-12 bg-success-13',
  'bg-warning-0 bg-warning-1 bg-warning-2 bg-warning-3 bg-warning-4 bg-warning-5 bg-warning-6 bg-warning-7 bg-warning-8 bg-warning-9 bg-warning-10 bg-warning-11 bg-warning-12 bg-warning-13',
  'bg-info-0 bg-info-1 bg-info-2 bg-info-3 bg-info-4 bg-info-5 bg-info-6 bg-info-7 bg-info-8 bg-info-9 bg-info-10 bg-info-11 bg-info-12 bg-info-13'
].flatMap((line) => line.split(' '))

// Every colour namespace reads the same keys, so the other utilities need a
// sample, not every step. None is the colour a probe inherits (text is
// neutral-12), or a missing utility would pass.
const OTHER_UTILITIES = [
  'text-neutral-11 border-neutral-7 fill-neutral-0 stroke-neutral-13',
  'text-brand-11 border-brand-7 fill-brand-9 stroke-brand-0',
  'text-accent-11 border-accent-7 fill-accent-9 stroke-accent-13',
  'text-danger-11 border-danger-7 fill-danger-9 stroke-danger-0',
  'text-success-11 border-success-7 fill-success-9 stroke-success-13',
  'text-warning-11 border-warning-7 fill-warning-9 stroke-warning-0',
  'text-info-11 border-info-7 fill-info-9 stroke-info-13'
].flatMap((line) => line.split(' '))

const PROPERTY = {
  bg: 'background-color',
  text: 'color',
  border: 'border-top-color',
  fill: 'fill',
  stroke: 'stroke'
} as const

function expectUtilitiesResolve(section: Element) {
  const probe = document.createElement('i')
  section.append(probe)
  for (const utility of [...EVERY_STEP, ...OTHER_UTILITIES]) {
    const [, prefix = '', token = ''] =
      /^(bg|text|border|fill|stroke)-(.+)$/.exec(utility) ?? []
    const property = PROPERTY[prefix as keyof typeof PROPERTY]
    expect(
      getComputedStyle(section).getPropertyValue(`--color-${token}`),
      `--color-${token}`
    ).not.toBe('')
    probe.className = ''
    probe.style.setProperty(property, `var(--color-${token})`)
    const expected = getComputedStyle(probe).getPropertyValue(property)
    probe.removeAttribute('style')
    probe.className = utility
    expect(getComputedStyle(probe).getPropertyValue(property), utility).toBe(
      expected
    )
  }
  probe.remove()
}

describe('raw scale utilities', () => {
  it('resolve to their token in light mode', () => {
    const { container } = render(<div />)
    expectUtilitiesResolve(container.firstElementChild!)
  })

  it('resolve to their token with .dark on the root', () => {
    document.documentElement.classList.add('dark')
    const { container } = render(<div />)
    expectUtilitiesResolve(container.firstElementChild!)
  })

  it('resolve to their token in a nested .dark section', () => {
    const { container } = render(
      <div>
        <div data-testid='light' />
        <div className='dark' data-testid='dark' />
      </div>
    )
    const light = container.querySelector('[data-testid=light]')!
    const dark = container.querySelector('[data-testid=dark]')!
    expectUtilitiesResolve(dark)
    expect(getComputedStyle(dark).getPropertyValue('--color-brand-1')).not.toBe(
      getComputedStyle(light).getPropertyValue('--color-brand-1')
    )
  })
})
