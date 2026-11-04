import { describe, it } from 'vitest'

import {
  expectFrameBudget,
  measureFrames,
  mount,
  setupFrameTests
} from '@oztix/roadie-frames'

import { ToggleGroup } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { EventPage, byText } from '../../utils/frameTestUtils'

setupFrameTests({ css: roadieCss })

describe('ToggleGroup slides at 60fps on a slowed CPU', () => {
  it('slides the pressed fill between items, press after press', async () => {
    await mount(
      <EventPage>
        <ToggleGroup aria-label='Date range' defaultValue={['7d']}>
          <ToggleGroup.Item value='7d'>7 days</ToggleGroup.Item>
          <ToggleGroup.Item value='30d'>30 days</ToggleGroup.Item>
          <ToggleGroup.Item value='90d'>Last 90 days</ToggleGroup.Item>
          <ToggleGroup.Item value='all'>All time</ToggleGroup.Item>
        </ToggleGroup>
      </EventPage>,
      { frames: 10 }
    )
    const presses = ['30 days', 'Last 90 days', 'All time', '7 days'].map(
      (label) => byText('button', label)
    )
    await expectFrameBudget(
      'ToggleGroup, four presses',
      await measureFrames(
        (index) => index % 30 === 0 && presses[index / 30]!.click(),
        { frames: 120 }
      )
    )
  })
})
