import { useRef } from 'react'

import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { RecordTable, tableColumns } from '.'
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
})
