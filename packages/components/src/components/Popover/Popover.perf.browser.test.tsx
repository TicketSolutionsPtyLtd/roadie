import { describe, expect, it } from 'vitest'

import {
  expectFrameBudget,
  measureFrames,
  mount,
  setupFrameTests
} from '@oztix/roadie-frames'

import { Popover } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { EventPage, byText, pressEscape } from '../../utils/frameTestUtils'

setupFrameTests({ css: roadieCss })

const popup = () => document.querySelector('[data-slot="popover-popup"]')

describe('Popover opens and closes at 60fps on a slowed CPU', () => {
  it('opens over a page of events and closes again', async () => {
    await mount(
      <EventPage>
        <Popover>
          <Popover.Trigger>Ticket details</Popover.Trigger>
          <Popover.Content>
            <Popover.Title>General admission</Popover.Title>
            <Popover.Description>
              Standing room, all ages. Doors at seven.
            </Popover.Description>
          </Popover.Content>
        </Popover>
      </EventPage>,
      { frames: 5 }
    )
    const trigger = byText('button', 'Ticket details')
    await expectFrameBudget(
      'Popover, open',
      await measureFrames((index) => index === 0 && trigger.click(), {
        frames: 60
      })
    )
    expect(popup()).not.toBeNull()
    await expectFrameBudget(
      'Popover, close',
      await measureFrames((index) => index === 0 && pressEscape(), {
        frames: 60
      })
    )
    expect(popup()).toBeNull()
  })
})
