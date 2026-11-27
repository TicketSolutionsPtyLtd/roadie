import { describe, expect, it } from 'vitest'

import {
  expectFrameBudget,
  measureFrames,
  mount,
  setupFrameTests
} from '@oztix/roadie-frames'

import { PhoneField } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { EventPage, pressEscape } from '../../utils/frameTestUtils'
import { Field } from '../Field'

setupFrameTests({ css: roadieCss })

describe('PhoneField opens its country picker at 60fps on a slowed CPU', () => {
  it('opens the list of every country and closes it', async () => {
    const root = await mount(
      <EventPage>
        <Field>
          <Field.Label>Mobile number</Field.Label>
          <PhoneField />
        </Field>
      </EventPage>,
      { frames: 5 }
    )
    const picker = root.querySelector<HTMLElement>(
      '[data-slot="phone-field-country"]'
    )!
    await expectFrameBudget(
      'PhoneField, open every country',
      await measureFrames((index) => index === 0 && picker.click(), {
        frames: 60
      })
    )
    expect(document.querySelectorAll('[role="option"]').length).toBeGreaterThan(
      0
    )
    await expectFrameBudget(
      'PhoneField, close',
      await measureFrames((index) => index === 0 && pressEscape(), {
        frames: 60
      })
    )
    expect(picker).toHaveAttribute('aria-expanded', 'false')
  })
})
