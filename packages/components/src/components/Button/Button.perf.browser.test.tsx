import { describe, it } from 'vitest'

import {
  expectFrameBudget,
  measureFrames,
  mount,
  setupFrameTests
} from '@oztix/roadie-frames'

import { Button } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { EventPage } from '../../utils/frameTestUtils'

setupFrameTests({ css: roadieCss })

describe('Button animates at 60fps on a slowed CPU', () => {
  it('spins twenty pending buttons', async () => {
    await mount(
      <EventPage>
        <div className='flex flex-wrap gap-2'>
          {Array.from({ length: 20 }, (_, index) => (
            <Button key={index} emphasis='strong' pending>
              Save changes
            </Button>
          ))}
        </div>
      </EventPage>,
      { frames: 10 }
    )
    await expectFrameBudget(
      'Button, twenty pending',
      await measureFrames(() => {})
    )
  })
})
