import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Table } from '.'

describe('Table', () => {
  it('renders semantic table parts with tabular figures', () => {
    render(
      <Table>
        <Table.Head>
          <Table.Row>
            <Table.HeaderCell>Show</Table.HeaderCell>
            <Table.HeaderCell align='end'>Sold</Table.HeaderCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          <Table.Row>
            <Table.Cell>Ball Park Music</Table.Cell>
            <Table.Cell align='end'>1,842</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>
    )
    expect(screen.getByRole('table')).toHaveClass('tabular-nums')
    expect(screen.getByRole('columnheader', { name: 'Sold' })).toHaveClass(
      'text-right'
    )
    expect(screen.getByRole('cell', { name: '1,842' })).toHaveClass(
      'text-right'
    )
    expect(screen.getByRole('columnheader', { name: 'Show' })).toHaveAttribute(
      'scope',
      'col'
    )
  })
})
