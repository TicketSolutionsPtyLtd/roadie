import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { type TestShow, showFields, testShows } from '../Records/testUtils'
import { RecordCalendar } from './RecordCalendarPreset'

const chips = () =>
  [...document.querySelectorAll('[data-slot="record-calendar-chip"]')].map(
    (chip) => chip.textContent
  )

describe('RecordCalendar', () => {
  it('searches the records on the calendar', async () => {
    const user = userEvent.setup()
    render(
      <RecordCalendar<TestShow>
        caption='Shows'
        data={testShows(4)}
        fields={showFields}
        now={new Date('2026-02-10T00:00:00Z')}
        calendar={{ dateField: 'starts', title: 'show' }}
      />
    )
    // testShows puts show-1 on 2 February.
    expect(chips()).toEqual(['Ball Park Music 1'])
    await user.type(screen.getByRole('combobox'), 'Ocean')
    await user.keyboard('{Enter}')
    expect(chips()).toEqual([])
    await user.click(screen.getByRole('button', { name: 'Previous month' }))
    expect(chips()).toEqual(['Ocean Alley 1'])
  })
})
