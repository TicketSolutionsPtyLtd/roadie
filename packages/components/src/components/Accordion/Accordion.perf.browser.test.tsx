import { describe, expect, it } from 'vitest'

import {
  expectFrameBudget,
  measureFrames,
  mount,
  setupFrameTests
} from '@oztix/roadie-frames'

import { Accordion } from '.'
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

describe('Accordion opens and closes at 60fps on a slowed CPU', () => {
  it('opens and closes an item above a page of events', async () => {
    await mount(
      <EventPage>
        <Accordion>
          {['Show all ticket types', 'Accessibility', 'Getting there'].map(
            (title) => (
              <Accordion.Item key={title}>
                <Accordion.Trigger>{title}</Accordion.Trigger>
                <Accordion.Content>
                  <ul className='grid gap-2'>
                    {TICKETS.map((ticket) => (
                      <li key={ticket}>{ticket}</li>
                    ))}
                  </ul>
                </Accordion.Content>
              </Accordion.Item>
            )
          )}
        </Accordion>
      </EventPage>,
      { frames: 5 }
    )
    const trigger = byText('summary', 'Show all ticket types')
    for (const [scenario, open] of [
      ['open', true],
      ['close', false]
    ] as const) {
      await expectFrameBudget(
        `Accordion, ${scenario}`,
        await measureFrames((index) => index === 0 && trigger.click(), {
          frames: 60
        })
      )
      expect(trigger.closest('details')!.open).toBe(open)
    }
  })
})
