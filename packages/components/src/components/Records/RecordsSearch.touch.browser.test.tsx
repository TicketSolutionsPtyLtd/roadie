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

  it('opens a tapped chip’s editor in a drawer, and its dates in another', async () => {
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
    const drawer = await screen.findByRole('dialog', { name: 'Starts' })
    expect(Math.round((await settledBox(drawer)).bottom)).toBe(844)
    await tapOn(within(drawer).getByRole('button', { name: /^Choose dates/ }))
    await tapOn(await screen.findByRole('button', { name: /^Next week/ }))
    await expect.poll(() => chip('Starts')?.textContent).toContain('Next week')
  })
})
