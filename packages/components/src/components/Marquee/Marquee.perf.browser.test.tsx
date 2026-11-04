import { describe, it } from 'vitest'

import {
  expectFrameBudget,
  measureFrames,
  mount,
  setupFrameTests
} from '@oztix/roadie-frames'

import { Marquee } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { EventPage, venues } from '../../utils/frameTestUtils'

const venuesList = venues(12)

setupFrameTests({ css: roadieCss })

describe('Marquee animates at 60fps on a slowed CPU', () => {
  it('scrolls a row of venues on a page of events', async () => {
    await mount(
      <EventPage>
        <div style={{ width: 1200 }}>
          <Marquee>
            {venuesList.map((venue) => (
              <span key={venue} className='text-display-ui-4'>
                {venue}
              </span>
            ))}
          </Marquee>
        </div>
      </EventPage>,
      { frames: 10 }
    )
    await expectFrameBudget('Marquee, scrolling', await measureFrames(() => {}))
  })
})
