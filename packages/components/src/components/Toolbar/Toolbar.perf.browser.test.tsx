import { describe, expect, it } from 'vitest'

import {
  expectFrameBudget,
  measureFrames,
  mount,
  setupFrameTests
} from '@oztix/roadie-frames'

import { Toolbar } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { EventPage, byText } from '../../utils/frameTestUtils'

setupFrameTests({ css: roadieCss })

describe('Toolbar slides at 60fps on a slowed CPU', () => {
  it('slides the pressed fill across a group, press after press', async () => {
    await mount(
      <EventPage>
        <Toolbar aria-label='Formatting'>
          <Toolbar.ToggleGroup aria-label='View' defaultValue={['day']}>
            {['Day', 'Week', 'Month', 'Year'].map((label) => (
              <Toolbar.Toggle key={label} value={label.toLowerCase()}>
                {label}
              </Toolbar.Toggle>
            ))}
          </Toolbar.ToggleGroup>
        </Toolbar>
      </EventPage>,
      { frames: 10 }
    )
    const presses = ['Week', 'Day', 'Month', 'Year'].map((label) =>
      byText('button', label)
    )
    await expectFrameBudget(
      'Toolbar, sliding group, four presses',
      await measureFrames(
        (index) => index % 30 === 0 && presses[index / 30]!.click(),
        { frames: 120 }
      )
    )
    expect(presses.at(-1)).toHaveAttribute('aria-pressed', 'true')
  })
})
