import { describe, expect, it } from 'vitest'

import {
  expectFrameBudget,
  measureFrames,
  mount,
  setupFrameTests
} from '@oztix/roadie-frames'

import { RecordGrid } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { showFields, testShows } from '../Records/testUtils'

setupFrameTests({ css: roadieCss })

const card = {
  title: 'show',
  description: 'city',
  trailing: 'status',
  details: ['sold', 'gross']
} as const

describe('RecordGrid scrolls at 60fps on a slowed CPU', () => {
  it.each([2000, 10_000])('scrolls %i cards', async (count) => {
    const root = await mount(
      <div style={{ width: 1200 }}>
        <RecordGrid
          data={testShows(count)}
          fields={showFields}
          defaultPosition={{ pageSize: count }}
          maxHeight='800px'
          card={card}
        />
      </div>,
      { frames: 5 }
    )
    const viewport = root.querySelector<HTMLElement>(
      '[data-slot="record-grid-viewport"]'
    )!
    await expectFrameBudget(
      `RecordGrid, ${count.toLocaleString('en-AU')} cards, scroll`,
      await measureFrames(() => {
        viewport.scrollTop += 60
      })
    )
    expect(
      root.querySelectorAll('[data-slot="record-grid-card"]').length
    ).toBeLessThan(300)
  })
})
