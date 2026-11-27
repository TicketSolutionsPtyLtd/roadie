import type { ReactElement } from 'react'

import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { STILL, useStylesheet } from '@oztix/roadie-browser-testing/stylesheet'

import roadieCss from '../../vitest.browser.css?inline'
import { Checkbox } from '../components/Checkbox'
import { Field } from '../components/Field'
import { NumberField } from '../components/NumberField'
import { RadioGroup } from '../components/RadioGroup'
import { Slider } from '../components/Slider'
import { Steps } from '../components/Steps'
import { Switch } from '../components/Switch'
import { focusAfterKey } from './testUtils'

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
afterEach(() => {
  cleanup()
  document.documentElement.classList.remove('dark')
})

/** A scale's step 9 at 30% alpha, as the browser serialises it. */
function step9At30(scale: string) {
  const probe = document.createElement('span')
  probe.style.color = `var(--color-${scale}-9)`
  document.body.append(probe)
  const { color } = getComputedStyle(probe)
  probe.remove()
  return color.replace(/\)$/, ' / 0.3)')
}

const slot = (name: string) =>
  document.querySelector<HTMLElement>(`[data-slot="${name}"]`)!

// Each control sets its ring colour at rest and widens it on focus, so the
// colour reads without focus, which Firefox doesn't always give a test frame.
const CONTROLS: [string, string, ReactElement, () => HTMLElement][] = [
  [
    'field',
    'accent',
    <Field key='field'>
      <Field.Label>Email</Field.Label>
      <Field.Input />
    </Field>,
    () => screen.getByRole('textbox')
  ],
  [
    'invalid field',
    'danger',
    <Field key='invalid' invalid>
      <Field.Label>Email</Field.Label>
      <Field.Input />
    </Field>,
    () => screen.getByRole('textbox')
  ],
  [
    'field group',
    'accent',
    <NumberField key='group' aria-label='Tickets' defaultValue={2} />,
    () =>
      screen
        .getByRole('textbox')
        .closest<HTMLElement>('[data-slot="number-field-group"]')!
  ],
  [
    'checkbox',
    'accent',
    <Checkbox key='checkbox' label='Presale alerts' />,
    () => screen.getByRole('checkbox')
  ],
  [
    'radio',
    'accent',
    <RadioGroup key='radio' defaultValue='floor'>
      <RadioGroup.Item value='floor' label='Floor' />
    </RadioGroup>,
    () => screen.getByRole('radio')
  ],
  [
    'switch',
    'accent',
    <Switch key='switch' aria-label='Presale alerts' />,
    () => screen.getByRole('switch')
  ],
  [
    'slider',
    'accent',
    <Slider key='slider' aria-label='Price' defaultValue={40} />,
    () => slot('slider-thumb')
  ],
  [
    'invalid checkbox',
    'danger',
    <Checkbox key='checkbox' invalid label='Presale alerts' />,
    () => screen.getByRole('checkbox')
  ],
  [
    'invalid radio',
    'danger',
    <RadioGroup key='radio' invalid defaultValue='floor'>
      <RadioGroup.Item value='floor' label='Floor' />
    </RadioGroup>,
    () => screen.getByRole('radio')
  ],
  [
    'invalid switch',
    'danger',
    <Switch key='switch' invalid aria-label='Presale alerts' />,
    () => screen.getByRole('switch')
  ],
  [
    'invalid slider',
    'danger',
    <Slider key='slider' invalid aria-label='Price' defaultValue={40} />,
    () => slot('slider-thumb')
  ],
  [
    'step indicator',
    'accent',
    <Steps key='steps' count={1}>
      <Steps.List>
        <Steps.Item index={0}>
          <Steps.Trigger>
            <Steps.Indicator>1</Steps.Indicator>
            Tickets
          </Steps.Trigger>
        </Steps.Item>
      </Steps.List>
    </Steps>,
    () => slot('steps-indicator')
  ]
]

// A card row rings the whole row while its control has keyboard focus.
const CARDS: [string, ReactElement, string][] = [
  [
    'checkbox',
    <Checkbox key='checkbox' emphasis='normal' label='Presale alerts' />,
    'checkbox'
  ],
  [
    'radio',
    <RadioGroup key='radio' emphasis='normal' defaultValue='floor'>
      <RadioGroup.Item value='floor' label='Floor' />
    </RadioGroup>,
    'radio'
  ]
]

describe.each([
  ['light', false],
  ['dark', true]
])('focus ring opacity in %s mode', (_mode, dark) => {
  it.each(CONTROLS)(
    'rings a %s at 30% of %s step 9',
    (_name, scale, control, target) => {
      document.documentElement.classList.toggle('dark', dark)
      render(control)

      expect(getComputedStyle(target()).outlineColor).toBe(step9At30(scale))
    }
  )

  it.each(CARDS)(
    'rings a focused %s card at 30% of accent step 9',
    async (_name, card, role) => {
      document.documentElement.classList.toggle('dark', dark)
      render(card)

      const control = await focusAfterKey(screen.getByRole(role))
      const row = control.closest('label')!

      expect(getComputedStyle(row).outlineColor).toBe(step9At30('accent'))
    }
  )

  it('rings a plain button at 30% of neutral step 9', async () => {
    document.documentElement.classList.toggle('dark', dark)
    render(<button type='button'>Buy tickets</button>)

    const button = await focusAfterKey(screen.getByRole('button'))

    expect(getComputedStyle(button).outlineColor).toBe(step9At30('neutral'))
  })

  it('rings a buttons-only stepper at 30% of accent step 9', async () => {
    document.documentElement.classList.toggle('dark', dark)
    render(
      <NumberField
        aria-label='Tickets'
        defaultValue={2}
        emphasis='subtler'
        editable={false}
      />
    )

    const input = await focusAfterKey(screen.getByRole('textbox'))
    const group = input.closest('[data-slot="number-field-group"]')!

    expect(getComputedStyle(group).outlineColor).toBe(step9At30('accent'))
  })

  it('rings an is-interactive-within surface at 30% of neutral step 9', async () => {
    document.documentElement.classList.toggle('dark', dark)
    render(
      <div data-testid='surface' className='is-interactive-within grid p-4'>
        <a data-interactive-target href='#gates'>
          Gates
        </a>
      </div>
    )

    await focusAfterKey(screen.getByRole('link'))

    expect(getComputedStyle(screen.getByTestId('surface')).outlineColor).toBe(
      step9At30('neutral')
    )
  })
})
