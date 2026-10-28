import { useRef } from 'react'

import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { RecordTable, tableColumns, tableLayout } from '.'
import { Records, useRecords } from '../Records'
import { useNarrow } from '../Records/narrow'
import { type TestShow, showFields, testShows } from '../Records/testUtils'

// Narrow layouts need a real width, so their tests are in the browser files.

function Probe() {
  const ref = useRef<HTMLDivElement>(null)
  const narrow = useNarrow(ref)
  return <div ref={ref}>{narrow ? 'narrow' : 'wide'}</div>
}

describe('useNarrow', () => {
  it('renders wide on the server', () => {
    expect(renderToString(<Probe />)).toContain('wide')
  })
})

const column = tableColumns<TestShow>(showFields)

describe('RecordTable Select mode', () => {
  it('leaves Select out of a wide toolbar', () => {
    render(
      <RecordTable
        caption='Shows'
        data={testShows(6)}
        fields={showFields}
        columns={[
          column.field('show', { pin: true, narrow: 'title' }),
          column.field('city', { narrow: 'description' })
        ]}
        getRowId={(row) => row.id}
        bulkActions={[{ label: 'Export', onAction: () => {} }]}
      />
    )
    expect(screen.getByRole('table', { name: 'Shows' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Select' })).toBeNull()
  })

  it('keeps the selection and stays quiet when an app enters Select mode on a wide table', async () => {
    const user = userEvent.setup()
    const layouts = [
      tableLayout([
        column.field('show', { pin: true, narrow: 'title' }),
        column.field('city', { narrow: 'description' })
      ])
    ]
    function Menu() {
      const records = useRecords({
        data: testShows(6),
        fields: showFields,
        getRowId: (row) => row.id,
        selectable: true
      })
      return (
        <>
          <button type='button' onClick={() => records.setSelecting(true)}>
            Select shows
          </button>
          <Records.Root records={records} layouts={layouts} caption='Shows'>
            <Records.Header />
            <Records.Content />
            <Records.Status />
          </Records.Root>
        </>
      )
    }
    render(<Menu />)
    await user.click(screen.getByRole('button', { name: 'Select shows' }))
    expect(screen.getByRole('status')).not.toHaveTextContent('Select mode')
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' }).focus()
    await user.keyboard('{Escape}')
    expect(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    ).toBeChecked()
    screen.getByRole('combobox', { name: 'Search and filter' }).focus()
    await user.keyboard('{Escape}')
    expect(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    ).toBeChecked()
  })
})
