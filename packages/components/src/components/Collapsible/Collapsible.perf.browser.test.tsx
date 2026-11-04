import { describe, it } from 'vitest'

import {
  expectFrameBudget,
  measureFrames,
  mount,
  setupFrameTests
} from '@oztix/roadie-frames'

import { Collapsible } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { EventPage, byText } from '../../utils/frameTestUtils'

setupFrameTests({ css: roadieCss })

const TICKETS = [
  'General admission',
  'Early bird',
  'VIP',
  'Concession',
  'Under 18',
  'Group of four'
]

describe('Collapsible opens and closes at 60fps on a slowed CPU', () => {
  it('opens and closes a panel above a page of events', async () => {
    await mount(
      <EventPage>
        <Collapsible>
          <Collapsible.Trigger>Show all ticket types</Collapsible.Trigger>
          <Collapsible.Panel>
            <ul className='grid gap-2'>
              {TICKETS.map((ticket) => (
                <li key={ticket}>{ticket}</li>
              ))}
            </ul>
          </Collapsible.Panel>
        </Collapsible>
      </EventPage>,
      { frames: 5 }
    )
    const trigger = byText('button', 'Show all ticket types')
    for (const scenario of ['open', 'close'])
      await expectFrameBudget(
        `Collapsible, ${scenario}`,
        await measureFrames((index) => index === 0 && trigger.click(), {
          frames: 60
        })
      )
  })
})
