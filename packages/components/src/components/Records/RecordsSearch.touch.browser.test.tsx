import { cleanup, render, screen, within } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import roadieCss from '../../../vitest.browser.css?inline'
import { tapOn } from '../../utils/touchTestUtils'
import { useStylesheet } from '../Pane/testUtils'
import { RecordTable, tableColumns } from '../RecordTable'
import { type TestShow, showFields, testShows } from './testUtils'
import type { RecordViewDefaults } from './types'

const TIMEOUT = { timeout: 20_000 }

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await page.viewport(390, 844)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const column = tableColumns<TestShow>(showFields)
const columns = [column.field('show', { pin: true }), column.field('status')]

function Shows({ defaultView }: { defaultView?: RecordViewDefaults }) {
  return (
    <RecordTable
      caption='Shows'
      data={testShows(40)}
      fields={showFields}
      columns={columns}
      getRowId={(row) => row.id}
      defaultView={defaultView}
      timeZone='Australia/Sydney'
      now={new Date('2026-10-03T02:00:00Z')}
    />
  )
}

const input = () => screen.getByRole('combobox', { name: 'Search and filter' })
const chipLabels = () =>
  [...document.querySelectorAll('[data-slot=combobox-chip-label]')].map(
    (label) => label.textContent
  )

describe('Records.Search by touch', TIMEOUT, () => {
  it('adds a filter from a tapped suggestion', async () => {
    render(<Shows />)
    await tapOn(input())
    await tapOn(await screen.findByRole('option', { name: /^Status/ }))
    await tapOn(await screen.findByRole('option', { name: 'Sold out' }))
    await expect.poll(chipLabels).toEqual(['Status is Sold out'])
  })

  // As an iPhone's keyboard is put away: the input blurs, and nothing takes focus.
  it('adds a filter from a value tapped once the input blurs', async () => {
    render(<Shows />)
    await tapOn(input())
    await tapOn(await screen.findByRole('option', { name: /^Status/ }))
    const value = await screen.findByRole('option', { name: 'Sold out' })
    input().blur()
    expect(document.activeElement).toBe(document.body)
    await tapOn(value)
    await expect.poll(chipLabels).toEqual(['Status is Sold out'])
  })

  it('adds a tapped day from the calendar in the dropdown', async () => {
    render(<Shows />)
    await tapOn(input())
    await tapOn(await screen.findByRole('option', { name: /^Starts/ }))
    await tapOn(
      within(screen.getByRole('group', { name: 'Operator' })).getByRole(
        'button',
        { name: 'is' }
      )
    )
    const day = () =>
      document.querySelector<HTMLElement>(
        '[data-slot=combobox-popup] button[data-date="2026-10-22"]:not([data-outside])'
      )
    await expect.poll(day).toBeTruthy()
    await tapOn(day()!)
    await expect.poll(chipLabels).toEqual(['Starts is on Thu 22 Oct'])
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
