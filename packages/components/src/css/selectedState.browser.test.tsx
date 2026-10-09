import { cleanup, render } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  onTestFinished
} from 'vitest'
import { commands, userEvent } from 'vitest/browser'

import roadieCss from '../../vitest.browser.css?inline'
import { useStylesheet } from '../components/Pane/testUtils'
import type { RoadieIntent } from '../variants'
import {
  apcaLc,
  minimumLc,
  oklchLightness,
  over,
  shownFill
} from './contrastTestUtils'
import { setHoverCapable } from './testUtils'

// The selected state of a quiet control, checked on the utilities rather than
// on any one component. Each floor sits under the lowest value measured across
// every intent, mode, surface and browser:
// - the chosen label is body text on its fill (lowest Lc 77.1, light danger);
// - it beats a resting label on the same surface by Lc 15 (lowest 19.4, light
//   neutral), so the label alone tells them apart;
// - a resting label is read as an icon, non-text UI (lowest Lc 58, dark danger);
// - APCA measures the soft fill against the surface as Lc 0 in dark mode, so the
//   fill is held apart by an OKLCH lightness step (lowest 0.079, light warning).
const CHOSEN_LABEL = minimumLc['body text']
const STRONGER_BY = 15
const RESTING_LABEL = minimumLc['non-text UI']
const FILL_STEP = 0.075

const STILL = '*, *::before, *::after { transition: none !important }'

let removeStylesheets = () => {}
beforeAll(() => {
  const removeRoadie = useStylesheet(roadieCss)
  const removeStill = useStylesheet(STILL)
  removeStylesheets = () => {
    removeRoadie()
    removeStill()
  }
})
afterAll(() => removeStylesheets())
afterEach(async () => {
  setHoverCapable(true)
  await userEvent.unhover(document.body)
  cleanup()
  document.documentElement.classList.remove('dark')
})

const INTENTS: RoadieIntent[] = [
  'neutral',
  'brand',
  'brand-secondary',
  'brand-blue',
  'brand-orange',
  'brand-purple',
  'accent',
  'danger',
  'success',
  'warning',
  'info'
]

const SURFACES = {
  page: 'bg-normal',
  card: 'emphasis-normal'
} as const
type Surface = keyof typeof SURFACES

type Placement = 'control' | 'section'

function renderSet({
  surface = 'page',
  intent = 'neutral',
  placement = 'control',
  dark = false
}: {
  surface?: Surface
  intent?: RoadieIntent
  placement?: Placement
  dark?: boolean
} = {}) {
  document.documentElement.classList.toggle('dark', dark)
  const sectionIntent = placement === 'section' ? `intent-${intent}` : ''
  const controlIntent = placement === 'control' ? `intent-${intent}` : ''
  const { container } = render(
    <div
      data-surface
      className={`${SURFACES[surface]} ${sectionIntent} grid gap-2 p-4`}
    >
      <div className={`${controlIntent} flex gap-2`}>
        <button
          data-rest
          className='is-interactive emphasis-subtler is-unselected'
        >
          Chart
        </button>
        <button
          data-chosen
          className='is-interactive emphasis-subtle is-selected'
        >
          Table
        </button>
        <button data-label className='is-interactive is-selected-label'>
          Map
        </button>
        <span data-strong className='emphasis-strong'>
          Day
        </span>
        <button
          data-label-on-strong
          className='is-interactive is-selected-label-on-strong'
        >
          Week
        </button>
        <span data-subtle className='text-subtle'>
          Subtle
        </span>
        <span data-normal className='text-normal'>
          Normal
        </span>
      </div>
    </div>
  )
  const get = (name: string) =>
    container.querySelector<HTMLElement>(`[data-${name}]`)!
  return {
    surface: shownFill(get('surface')),
    get
  }
}

const colour = (element: Element) => getComputedStyle(element).color
const labelOn = (element: Element, fill: ReturnType<typeof shownFill>) =>
  Math.abs(apcaLc(over(fill, colour(element)), fill))

describe.each([
  ['light', false],
  ['dark', true]
] as const)('a chosen item in %s mode', (_mode, dark) => {
  describe.each(Object.keys(SURFACES) as Surface[])('on the %s', (surface) => {
    it.each(INTENTS)('stands apart from its siblings in %s', (intent) => {
      for (const placement of ['control', 'section'] as const) {
        const { surface: surfaceFill, get } = renderSet({
          surface,
          intent,
          placement,
          dark
        })
        const fill = shownFill(get('chosen'))
        const where = `${placement} intent`

        expect(labelOn(get('chosen'), fill), where).toBeGreaterThanOrEqual(
          CHOSEN_LABEL
        )
        expect(
          labelOn(get('chosen'), surfaceFill) -
            labelOn(get('rest'), surfaceFill),
          where
        ).toBeGreaterThanOrEqual(STRONGER_BY)
        expect(
          labelOn(get('rest'), shownFill(get('rest'))),
          where
        ).toBeGreaterThanOrEqual(RESTING_LABEL)
        expect(
          Math.abs(oklchLightness(fill) - oklchLightness(surfaceFill)),
          where
        ).toBeGreaterThanOrEqual(FILL_STEP)
        cleanup()
      }
    })
  })
})

describe('the selected utilities', () => {
  it('rest on subtle text over an emphasis of their own', () => {
    const { get } = renderSet()
    expect(colour(get('rest'))).toBe(colour(get('subtle')))
  })

  it('give a label over an indicator the same colour as the fill would', () => {
    const { get } = renderSet()
    expect(colour(get('label'))).toBe(colour(get('chosen')))
    expect(colour(get('label-on-strong'))).toBe(colour(get('strong')))
  })

  it('lift a resting label a step on hover and hold the chosen one', async () => {
    setHoverCapable(true)
    const { get } = renderSet()
    const chosen = colour(get('chosen'))
    const label = colour(get('label'))

    await userEvent.hover(get('rest'))
    expect(colour(get('rest'))).toBe(colour(get('normal')))

    for (const [name, before] of [
      ['chosen', chosen],
      ['label', label]
    ] as const) {
      await userEvent.hover(get(name))
      expect(colour(get(name))).toBe(before)
    }
  })

  it('keeps a resting label still under a tap on a touch screen', async () => {
    setHoverCapable(false)
    const { get } = renderSet()
    await userEvent.hover(get('rest'))
    expect(colour(get('rest'))).toBe(colour(get('subtle')))
  })
})

describe('a chosen item under forced colours', () => {
  it('keeps an edge that differs from its siblings', async (context) => {
    const { get } = renderSet({ surface: 'card' })
    const probe = document.createElement('span')
    probe.style.background = 'Canvas'
    get('surface').append(probe)
    await commands.forcedColors(true)
    onTestFinished(() => commands.forcedColors(false))
    if (!matchMedia('(forced-colors: active)').matches) {
      context.skip()
      return
    }
    const canvas = getComputedStyle(probe).backgroundColor
    const edge = (element: Element) => getComputedStyle(element).borderTopColor

    expect(getComputedStyle(get('chosen')).borderTopStyle).toBe('solid')
    expect(edge(get('chosen'))).not.toBe(canvas)
    expect(edge(get('chosen'))).not.toBe(edge(get('rest')))
  })
})
