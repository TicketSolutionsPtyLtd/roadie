import { describe, it } from 'vitest'

import {
  expectFrameBudget,
  measureFrames,
  mount,
  setupFrameTests
} from '@oztix/roadie-frames'

import { Steps } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { EventPage, byText } from '../../utils/frameTestUtils'

setupFrameTests({ css: roadieCss })

const STEPS = ['Tickets', 'Details', 'Payment', 'Confirm']

describe('Steps moves at 60fps on a slowed CPU', () => {
  it('steps through checkout with Next', async () => {
    await mount(
      <EventPage>
        <Steps count={STEPS.length}>
          <Steps.List>
            {STEPS.map((step, index) => (
              <Steps.Item key={step} index={index}>
                <Steps.Trigger>
                  <Steps.Indicator>{index + 1}</Steps.Indicator>
                  {step}
                </Steps.Trigger>
                {index < STEPS.length - 1 && <Steps.Separator />}
              </Steps.Item>
            ))}
          </Steps.List>
          {STEPS.map((step, index) => (
            <Steps.Content key={step} index={index}>
              {step} for The Rolling Kazoos
            </Steps.Content>
          ))}
          <Steps.Progress />
          <Steps.NextTrigger>Next</Steps.NextTrigger>
        </Steps>
      </EventPage>,
      { frames: 5 }
    )
    const next = byText('button', 'Next')
    await expectFrameBudget(
      'Steps, three Next presses',
      await measureFrames((index) => index % 30 === 0 && next.click(), {
        frames: 90
      })
    )
  })
})
