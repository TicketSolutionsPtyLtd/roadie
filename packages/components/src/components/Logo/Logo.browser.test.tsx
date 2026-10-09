import type { ReactElement } from 'react'

import { cleanup, render, screen } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  onTestFinished
} from 'vitest'

import { Logo } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const COLLAPSE =
  '.collapsed :is([data-slot=logo-wordmark], [data-slot=logo-product]) { grid-template-columns: 0fr }'

// The mark is 1em square, so it measures the em the gap is set in.
function renderLogo(logo: ReactElement, collapsed = false) {
  render(<div className={collapsed ? 'collapsed' : undefined}>{logo}</div>)
  const root = screen.getByRole('img')
  const box = (slot: string) =>
    root.querySelector(`[data-slot=${slot}]`)!.getBoundingClientRect()
  return { root: root.getBoundingClientRect(), box }
}

describe.each([
  ['logo-wordmark', <Logo key='normal' />, 'svg'],
  ['logo-product', <Logo key='product' product='Studio' />, 'span span']
] as const)('the %s part', (slot, logo, content) => {
  it('sits 1em/6 after the mark', () => {
    const { box } = renderLogo(logo)
    const inner = document
      .querySelector(`[data-slot=${slot}] ${content}`)!
      .getBoundingClientRect()

    expect(box(slot).left).toBeCloseTo(box('logo-mark').right, 0)
    const em = box('logo-mark').width
    expect(inner.left - box('logo-mark').right).toBeCloseTo(em / 6, 1)
  })

  it('folds away with its gap when a parent collapses its column, leaving the mark', () => {
    onTestFinished(useStylesheet(COLLAPSE))
    const { root, box } = renderLogo(logo, true)

    expect(box(slot).width).toBe(0)
    expect(root.width).toBeCloseTo(box('logo-mark').width, 1)
  })
})
