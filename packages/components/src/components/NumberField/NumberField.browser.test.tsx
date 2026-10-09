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
import { userEvent } from 'vitest/browser'

import { NumberField } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'

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
afterEach(() => cleanup())

const CASES = [
  { name: 'boxed field', props: {}, ringOn: 'group' },
  { name: 'editable chip', props: { emphasis: 'subtler' }, ringOn: 'input' },
  {
    name: 'buttons-only stepper',
    props: { emphasis: 'subtler', editable: false },
    ringOn: 'group'
  }
] as const

function mount(props: (typeof CASES)[number]['props']) {
  render(
    <div className='grid gap-4 p-6'>
      <button type='button'>Before</button>
      <NumberField aria-label='Tickets' defaultValue={2} {...props} />
    </div>
  )
  const input = screen.getByRole('textbox', { name: 'Tickets' })
  const group = input.closest<HTMLElement>('[data-slot="number-field-group"]')!
  return { input, group }
}

const ringWidth = (element: HTMLElement) => {
  const { outlineStyle, outlineWidth } = getComputedStyle(element)
  return outlineStyle === 'none' ? 0 : parseFloat(outlineWidth)
}

// Firefox gives only one test frame document focus when files run in
// parallel. Without it no :focus rule matches, so the ring checks would say
// nothing; skip rather than pass vacuously.
async function tabIn(skip: (note: string) => void) {
  screen.getByRole('button', { name: 'Before' }).focus()
  await userEvent.keyboard('{Tab}')
  if (!document.hasFocus()) skip('the test frame has no document focus')
}

describe.each(CASES)('$name', ({ props, ringOn }) => {
  it('rings on keyboard focus', async ({ skip }) => {
    const { input, group } = mount(props)
    await tabIn(skip)

    expect(document.activeElement).toBe(input)
    expect(ringWidth(ringOn === 'group' ? group : input)).toBeGreaterThan(0)
  })

  it('hides the ring after a mouse press on a stepper, until a key', async ({
    skip
  }) => {
    const { input, group } = mount(props)
    await tabIn(skip)
    await userEvent.click(screen.getByRole('button', { name: 'Increase' }))

    expect(input).toHaveValue('3')
    expect(document.activeElement).toBe(input)
    expect(ringWidth(group)).toBe(0)
    expect(ringWidth(input)).toBe(0)

    await userEvent.keyboard('{ArrowUp}')
    expect(input).toHaveValue('4')
    expect(ringWidth(ringOn === 'group' ? group : input)).toBeGreaterThan(0)
  })
})

describe('NumberField group', () => {
  it.each([
    ['sm', 32],
    ['md', 40],
    ['lg', 48]
  ] as const)('stands %s at %ipx', (size, height) => {
    render(<NumberField aria-label='Tickets' size={size} />)
    const group = screen
      .getByRole('textbox', { name: 'Tickets' })
      .closest('[data-slot="number-field-group"]')!
    expect(group.getBoundingClientRect().height).toBe(height)
  })

  it('stands md by default', () => {
    render(<NumberField aria-label='Tickets' />)
    const group = screen
      .getByRole('textbox', { name: 'Tickets' })
      .closest('[data-slot="number-field-group"]')!
    expect(group.getBoundingClientRect().height).toBe(40)
  })
})

const COARSE = '(pointer: coarse)'

function coarseGates(rules: CSSRuleList, found: CSSMediaRule[] = []) {
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSMediaRule && rule.conditionText === COARSE)
      found.push(rule)
    if ('cssRules' in rule)
      coarseGates((rule as CSSGroupingRule).cssRules, found)
  }
  return found
}

// Playwright can't emulate a coarse pointer, so each gate is pinned to match.
function pointAsTouchScreen() {
  const gates = Array.from(document.styleSheets).flatMap((sheet) =>
    coarseGates(sheet.cssRules)
  )
  for (const rule of gates) rule.media.mediaText = 'all'
  onTestFinished(() => {
    for (const rule of gates) rule.media.mediaText = COARSE
  })
}

describe('the value cell', () => {
  function cellWidth(props: { editable?: boolean }) {
    render(
      <NumberField aria-label='Tickets' emphasis='subtler' max={9} {...props} />
    )
    const cell = screen
      .getByRole('textbox', { name: 'Tickets' })
      .closest<HTMLElement>('[data-slot="number-field-value"]')!
    const ch = document.createElement('span')
    ch.style.cssText = 'position: absolute; width: 1ch'
    cell.append(ch)
    const oneCh = ch.getBoundingClientRect().width
    ch.remove()
    return { width: cell.getBoundingClientRect().width, oneCh }
  }

  it('hugs a one-digit value, with 0.5rem either side, when not editable', () => {
    const { width, oneCh } = cellWidth({ editable: false })
    expect(width).toBeCloseTo(oneCh + 16, 0)
  })

  it('keeps a 2.75rem tap target when editable', () => {
    expect(cellWidth({}).width).toBeCloseTo(44, 0)
  })

  it('keeps a 3.5rem tap target on a touch screen', () => {
    pointAsTouchScreen()
    expect(cellWidth({}).width).toBeCloseTo(56, 0)
  })
})
