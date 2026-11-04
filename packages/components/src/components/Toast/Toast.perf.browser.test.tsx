import { describe, expect, it } from 'vitest'

import {
  expectFrameBudget,
  measureFrames,
  mount,
  setupFrameTests
} from '@oztix/roadie-frames'

import { Toast, createToastManager } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { EventPage } from '../../utils/frameTestUtils'

setupFrameTests({ css: roadieCss })

const MESSAGES = [
  'Two tickets added to your cart',
  'Seats held for 10 minutes',
  'Order 4821 confirmed',
  'Tickets sent to your email'
]

describe('Toast stacks at 60fps on a slowed CPU', () => {
  it('stacks four toasts as they arrive', async () => {
    const manager = createToastManager()
    await mount(
      <EventPage>
        <Toast.Provider toastManager={manager}>
          <Toast.Viewport />
        </Toast.Provider>
      </EventPage>,
      { frames: 5 }
    )
    await expectFrameBudget(
      'Toast, four arrive',
      await measureFrames(
        (index) =>
          index % 24 === 0 &&
          manager.add({ title: MESSAGES[index / 24]!, timeout: 0 }),
        { frames: 96 }
      )
    )
    expect(document.querySelectorAll('[data-slot="toast"]')).toHaveLength(4)
  })
})
