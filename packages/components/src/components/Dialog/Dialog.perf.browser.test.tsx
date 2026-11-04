import { describe, expect, it } from 'vitest'

import {
  expectFrameBudget,
  measureFrames,
  mount,
  setupFrameTests
} from '@oztix/roadie-frames'

import { Dialog } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { EventPage, byText, pressEscape } from '../../utils/frameTestUtils'

setupFrameTests({ css: roadieCss })

const popup = () => document.querySelector('[data-slot="dialog-popup"]')

describe('Dialog opens and closes at 60fps on a slowed CPU', () => {
  it('opens over a page of events and closes again', async () => {
    await mount(
      <EventPage>
        <Dialog>
          <Dialog.Trigger>Edit event</Dialog.Trigger>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Edit event</Dialog.Title>
              <Dialog.Description>
                The Rolling Kazoos at Kazoo Hollow Room
              </Dialog.Description>
            </Dialog.Header>
            <Dialog.Body>
              <p>Doors open at seven, with two local acts in support.</p>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.Close>Cancel</Dialog.Close>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog>
      </EventPage>,
      { frames: 5 }
    )
    const trigger = byText('button', 'Edit event')
    await expectFrameBudget(
      'Dialog, open',
      await measureFrames((index) => index === 0 && trigger.click(), {
        frames: 60
      }),
      { knownMiss: 'INNO-1522' }
    )
    expect(popup()).not.toBeNull()
    await expectFrameBudget(
      'Dialog, close',
      await measureFrames((index) => index === 0 && pressEscape(), {
        frames: 60
      }),
      { knownMiss: 'INNO-1522' }
    )
    expect(popup()).toBeNull()
  })
})
