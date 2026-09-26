import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
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
