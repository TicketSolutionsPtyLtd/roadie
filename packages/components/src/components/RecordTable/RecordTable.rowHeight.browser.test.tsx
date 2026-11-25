import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest'

import { RecordTable } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'
import { showFields, testShows } from '../Records/testUtils'
import { ROW_PX, frame, showColumns } from './testUtils'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const body = () =>
  document
    .querySelector('[data-slot="record-table-body"]')!
    .getBoundingClientRect()

function Shows() {
  return (
    <RecordTable
      caption='Shows'
      data={testShows(300)}
      fields={showFields}
      columns={showColumns}
      getRowId={(row) => row.id}
      defaultPosition={{ pageSize: 300 }}
    />
  )
}

it('windows its rows at the height the table sets', async () => {
  render(<Shows />)
  await frame()
  await expect.poll(() => body().height).toBeCloseTo(300 * ROW_PX, -1)
})

it('windows its rows at a row height a stylesheet sets', async () => {
  const removeTall = useStylesheet(
    '[data-slot="record-table-content"] { --record-table-row-height: 4rem }'
  )
  try {
    render(<Shows />)
    await frame()
    await expect.poll(() => body().height).toBeCloseTo(300 * 64, -1)
    const [first, second] = document.querySelectorAll(
      '[data-slot="record-table-row"]'
    )
    expect(
      second!.getBoundingClientRect().top - first!.getBoundingClientRect().top
    ).toBe(64)
  } finally {
    removeTall()
  }
})
