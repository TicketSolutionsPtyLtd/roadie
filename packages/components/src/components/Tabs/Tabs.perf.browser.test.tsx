import { describe, it } from 'vitest'

import {
  expectFrameBudget,
  measureFrames,
  mount,
  setupFrameTests
} from '@oztix/roadie-frames'

import { Tabs } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { EventPage, byText } from '../../utils/frameTestUtils'

setupFrameTests({ css: roadieCss })

describe('Tabs slides at 60fps on a slowed CPU', () => {
  it('moves the indicator between tabs, tab after tab', async () => {
    await mount(
      <EventPage>
        <Tabs defaultValue='orders'>
          <Tabs.List aria-label='Event'>
            <Tabs.Tab value='orders'>Orders</Tabs.Tab>
            <Tabs.Tab value='tickets'>Ticket types</Tabs.Tab>
            <Tabs.Tab value='attendees'>Attendees</Tabs.Tab>
            <Tabs.Tab value='settings'>Settings</Tabs.Tab>
            <Tabs.Indicator />
          </Tabs.List>
        </Tabs>
      </EventPage>,
      { frames: 10 }
    )
    const presses = ['Ticket types', 'Attendees', 'Settings', 'Orders'].map(
      (label) => byText('[role="tab"]', label)
    )
    await expectFrameBudget(
      'Tabs, four tab changes',
      await measureFrames(
        (index) => index % 30 === 0 && presses[index / 30]!.click(),
        { frames: 120 }
      )
    )
  })
})
