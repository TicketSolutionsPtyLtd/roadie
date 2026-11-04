import { describe, expect, it } from 'vitest'

import {
  expectFrameBudget,
  measureFrames,
  mount,
  setupFrameTests
} from '@oztix/roadie-frames'

import { Drawer } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { EventPage, byText, pressEscape } from '../../utils/frameTestUtils'

setupFrameTests({ css: roadieCss })

const popup = () => document.querySelector('[data-slot="drawer-popup"]')

describe('Drawer opens and closes at 60fps on a slowed CPU', () => {
  it('opens over a page of events and closes again', async () => {
    await mount(
      <EventPage>
        <Drawer>
          <Drawer.Trigger>Your tickets</Drawer.Trigger>
          <Drawer.Content>
            <Drawer.Header>
              <Drawer.Title>Your tickets</Drawer.Title>
            </Drawer.Header>
            <Drawer.Body>
              <p>Two general admission tickets for Friday night.</p>
            </Drawer.Body>
          </Drawer.Content>
        </Drawer>
      </EventPage>,
      { frames: 5 }
    )
    const trigger = byText('button', 'Your tickets')
    await expectFrameBudget(
      'Drawer, open',
      await measureFrames((index) => index === 0 && trigger.click(), {
        frames: 60
      })
    )
    expect(popup()).not.toBeNull()
    await expectFrameBudget(
      'Drawer, close',
      await measureFrames((index) => index === 0 && pressEscape(), {
        frames: 60
      })
    )
    expect(popup()).toBeNull()
  })
})
