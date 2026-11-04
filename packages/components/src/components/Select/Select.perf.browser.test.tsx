import { describe, expect, it } from 'vitest'

import {
  expectFrameBudget,
  measureFrames,
  mount,
  setupFrameTests
} from '@oztix/roadie-frames'

import { Select } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { EventPage, pressEscape, venues } from '../../utils/frameTestUtils'
import { Field } from '../Field'

setupFrameTests({ css: roadieCss })

describe('Select opens and closes at 60fps on a slowed CPU', () => {
  it('opens a list of 200 venues and closes it', async () => {
    const root = await mount(
      <EventPage>
        <Field>
          <Field.Label>Venue</Field.Label>
          <Select>
            <Select.Trigger>
              <Select.Value placeholder='Choose a venue' />
              <Select.Icon />
            </Select.Trigger>
            <Select.Content>
              {venues(200).map((venue) => (
                <Select.Item key={venue} value={venue}>
                  {venue}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </Field>
      </EventPage>,
      { frames: 5 }
    )
    const trigger = root.querySelector<HTMLElement>('[role="combobox"]')!
    await expectFrameBudget(
      'Select, open 200 items',
      await measureFrames((index) => index === 0 && trigger.click(), {
        frames: 60
      }),
      { knownMiss: 'INNO-1524' }
    )
    expect(document.querySelectorAll('[role="option"]')).toHaveLength(200)
    // Closing re-renders all 200 items (INNO-1524), a two-vsync frame or three in CI.
    await expectFrameBudget(
      'Select, close',
      await measureFrames((index) => index === 0 && pressEscape(), {
        frames: 60
      }),
      { p95: 34 }
    )
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })
})
