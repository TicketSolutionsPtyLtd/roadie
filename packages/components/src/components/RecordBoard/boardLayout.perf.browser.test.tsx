import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { commands } from 'vitest/browser'

import {
  expectFrameBudget,
  measureWhile,
  mount,
  setupFrameTests
} from '@oztix/roadie-frames'

import roadieCss from '../../../vitest.browser.css?inline'
import { releaseDragPointer } from '../../css/testUtils'
import { testShows } from '../Records/testUtils'
import { Shows } from './boardTestUtils'

setupFrameTests({ css: roadieCss })
// After a drop the library covers the pointer until it moves.
beforeEach(() => commands.pointer([{ type: 'move', x: 1, y: 1, steps: 2 }]))
afterEach(releaseDragPointer)

const centre = (element: Element) => {
  const box = element.getBoundingClientRect()
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
}

describe('boardLayout drags at 60fps on a slowed CPU', () => {
  it('drags a card across a board of 300', async () => {
    const root = await mount(<Shows shows={testShows(300)} />, { frames: 5 })
    const from = centre(
      root.querySelector('button[aria-label="Reorder Ocean Alley 1"]')!
    )
    const to = centre(
      root
        .querySelector('[aria-label="Cancelled"]')!
        .querySelector('[data-slot="sortable-item"]')!
    )
    await expectFrameBudget(
      'RecordBoard, drag across 300 cards',
      await measureWhile(() =>
        commands.pointer([
          { type: 'move', ...from },
          { type: 'down' },
          { type: 'move', x: from.x + 12, y: from.y, steps: 4 },
          { type: 'move', x: to.x, y: to.y, steps: 60 },
          { type: 'up' }
        ])
      )
    )
    await expect
      .poll(() =>
        [
          ...root
            .querySelector('[aria-label="Cancelled"]')!
            .querySelectorAll('[data-slot="card-title"]')
        ].some((title) => title.textContent === 'Ocean Alley 1')
      )
      .toBe(true)
  })
})
