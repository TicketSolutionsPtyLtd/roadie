import { describe, it } from 'vitest'

import {
  expectFrameBudget,
  measureFrames,
  mount,
  setupFrameTests
} from '@oztix/roadie-frames'

import { Skeleton } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { EventPage } from '../../utils/frameTestUtils'

setupFrameTests({ css: roadieCss })

describe('Skeleton animates at 60fps on a slowed CPU', () => {
  it('shimmers a loading list of 30 rows', async () => {
    await mount(
      <EventPage>
        <div className='grid gap-3' style={{ width: 600 }}>
          {Array.from({ length: 30 }, (_, index) => (
            <div key={index} className='grid grid-cols-[auto_1fr] gap-3'>
              <Skeleton shape='circle' className='size-10' />
              <div className='grid gap-2'>
                <Skeleton />
                <Skeleton className='w-1/2' />
              </div>
            </div>
          ))}
        </div>
      </EventPage>,
      { frames: 10 }
    )
    await expectFrameBudget(
      'Skeleton, shimmer, 90 placeholders',
      await measureFrames(() => {})
    )
  })
})
