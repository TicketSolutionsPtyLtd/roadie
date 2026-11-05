import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import {
  expectFrameBudget,
  measureWhile,
  mount,
  setupFrameTests
} from '@oztix/roadie-frames'

import { QueryField, type QueryFieldSuggestionGroup } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { EventPage, venues } from '../../utils/frameTestUtils'
import { Tooltip } from '../Tooltip'

setupFrameTests({ css: roadieCss })

const VENUES = venues(2000)

const suggest = (text: string): QueryFieldSuggestionGroup[] => {
  const query = text.trim().toLowerCase()
  if (!query) return []
  return [
    {
      id: 'venues',
      label: 'Venues',
      items: VENUES.filter((venue) => venue.toLowerCase().includes(query))
        .slice(0, 8)
        .map((venue) => ({
          id: `venue:${venue}`,
          label: `Venue is ${venue}`,
          kind: 'filter' as const,
          value: venue
        }))
    }
  ]
}

describe('QueryField types at 60fps on a slowed CPU', () => {
  it('suggests from 2,000 venues as someone types', async () => {
    const root = await mount(
      <EventPage>
        <Tooltip.Provider delay={0}>
          <div style={{ width: 480 }}>
            <QueryField
              aria-label='Search orders'
              chips={[{ id: 'status', label: 'Status is On sale' }]}
              onRemoveChip={() => {}}
              suggest={suggest}
            />
          </div>
        </Tooltip.Provider>
      </EventPage>,
      { frames: 5 }
    )
    const input = root.querySelector<HTMLInputElement>('[role="combobox"]')!
    await userEvent.click(input)
    await expectFrameBudget(
      'QueryField, typing',
      await measureWhile(() => userEvent.keyboard('iguana teapot'))
    )
    expect(input.value).toBe('iguana teapot')
    await expect
      .poll(() => document.querySelectorAll('[role="option"]').length)
      .toBeGreaterThan(0)
  })
})
