import { useState } from 'react'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { commands } from 'vitest/browser'

import {
  expectFrameBudget,
  measureWhile,
  mount,
  setupFrameTests
} from '@oztix/roadie-frames'

import { Sortable } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { releaseDragPointer } from '../../css/testUtils'
import { List } from '../List'

setupFrameTests({ css: roadieCss })
// After a drop the library covers the pointer until it moves.
beforeEach(() => commands.pointer([{ type: 'move', x: 1, y: 1, steps: 2 }]))
afterEach(releaseDragPointer)

const SETLIST = Array.from(
  { length: 50 },
  (_, index) => `Song ${index + 1}, The Rolling Kazoos`
)

function Setlist() {
  const [items, setItems] = useState(SETLIST)
  return (
    <div style={{ width: 480, height: 600, overflowY: 'auto' }}>
      <Sortable items={items} label='songs' onReorder={setItems}>
        <List>
          {items.map((value) => (
            <List.Item key={value} value={value} title={value} />
          ))}
        </List>
      </Sortable>
    </div>
  )
}

const centre = (element: Element) => {
  const box = element.getBoundingClientRect()
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
}

describe('Sortable drags at 60fps on a slowed CPU', () => {
  it('drags a song down a setlist of 50', async () => {
    const root = await mount(<Setlist />, { frames: 5 })
    const from = centre(
      root.querySelector(
        'button[aria-label="Reorder Song 1, The Rolling Kazoos"]'
      )!
    )
    const to = centre(root.querySelectorAll('[data-slot="sortable-item"]')[8]!)
    await expectFrameBudget(
      'Sortable, drag down 50 rows',
      await measureWhile(() =>
        commands.pointer([
          { type: 'move', ...from },
          { type: 'down' },
          { type: 'move', x: from.x, y: from.y + 12, steps: 4 },
          { type: 'move', x: to.x, y: to.y, steps: 60 },
          { type: 'up' }
        ])
      )
    )
    await expect
      .poll(() =>
        root
          .querySelector('button[aria-label^="Reorder "]')
          ?.getAttribute('aria-label')
      )
      .toBe('Reorder Song 2, The Rolling Kazoos')
  })
})
