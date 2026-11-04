import { describe, it } from 'vitest'

import {
  expectFrameBudget,
  measureFrames,
  mount,
  setupFrameTests
} from '@oztix/roadie-frames'

import { Countdown } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { EventPage } from '../../utils/frameTestUtils'

setupFrameTests({ css: roadieCss })

const onSale = new Date(Date.now() + 3_600_000)

describe('Countdown animates at 60fps on a slowed CPU', () => {
  it('ticks a clock to an on sale for two seconds', async () => {
    await mount(
      <EventPage>
        <Countdown until={onSale} seconds='always' />
      </EventPage>,
      { frames: 10 }
    )
    await expectFrameBudget('Countdown, ticking', await measureFrames(() => {}))
  })
})
