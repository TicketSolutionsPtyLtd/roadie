import { cleanup, render, screen, within } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import roadieCss from '../../../vitest.browser.css?inline'
import { settledBox, tapOn } from '../../utils/touchTestUtils'
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
const chip = (label: string) =>
  [...document.querySelectorAll<HTMLElement>('[data-slot=combobox-chip]')].find(
    (element) => element.textContent?.includes(label)
  )
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

  it('opens Custom dates for a tapped date chip in a drawer, and its dates in another', async () => {
    render(
      <Shows
        defaultView={{
          query: {
            filters: [
              { field: 'starts', operator: 'within', value: 'this-weekend' }
            ]
          }
        }}
      />
    )
    await tapOn(chip('Starts')!.querySelector('button')!)
    await tapOn(await screen.findByRole('option', { name: 'Custom dates' }))
    const drawer = await screen.findByRole('dialog', { name: 'Starts' })
    expect(Math.round((await settledBox(drawer)).bottom)).toBe(844)
    await tapOn(within(drawer).getByRole('button', { name: /^Choose dates/ }))
    await tapOn(await screen.findByRole('button', { name: /^Next week/ }))
    await expect
      .poll(() => chip('Starts')?.textContent)
      .toContain('is next week')
  })

  it('titles a date’s drawer with the field, as the editor is', async () => {
    render(<Shows />)
    await tapOn(input())
    await tapOn(await screen.findByRole('option', { name: /^Starts/ }))
    await tapOn(await screen.findByRole('option', { name: 'Custom dates' }))
    const drawer = await screen.findByRole('dialog', { name: 'Starts' })
    await tapOn(
      within(drawer).getByRole('combobox', { name: 'Starts condition' })
    )
    await tapOn(await screen.findByRole('option', { name: 'Is on' }))
    await tapOn(within(drawer).getByRole('button', { name: /^Choose date/ }))
    const calendar = await screen.findByRole('dialog', { name: /Choose date/ })
    expect(
      within(calendar).getByRole('heading', { name: 'Starts' })
    ).toBeVisible()
  })

  it('adds a new date filter from Custom dates in a drawer', async () => {
    render(<Shows />)
    await tapOn(input())
    await tapOn(await screen.findByRole('option', { name: /^Starts/ }))
    await tapOn(await screen.findByRole('option', { name: 'Custom dates' }))
    const drawer = await screen.findByRole('dialog', { name: 'Starts' })
    await tapOn(within(drawer).getByRole('button', { name: /^Choose dates/ }))
    const calendar = await screen.findByRole('dialog', { name: /dates/ })
    expect(
      within(calendar).getByRole('heading', { name: 'Starts' })
    ).toBeVisible()
    await tapOn(within(calendar).getByRole('tab', { name: 'Periods' }))
    await tapOn(await screen.findByRole('button', { name: /^Next week/ }))
    await expect
      .poll(() => chip('Starts')?.textContent)
      .toContain('is next week')
  })
})
