import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { SmallMultiples } from '.'
import { Chart } from '../Chart'
import { gatesExample } from './examples'

describe('SmallMultiples', () => {
  it('draws one named plot per panel', () => {
    render(<SmallMultiples {...gatesExample} />)
    expect(screen.getAllByRole('img')).toHaveLength(4)
    expect(
      screen.getByRole('figure', { name: 'North gate' })
    ).toBeInTheDocument()
  })

  it('draws line panels too', () => {
    render(
      <SmallMultiples
        {...gatesExample}
        chart={{ kind: 'line', x: 'time', y: 'scans' }}
      />
    )
    expect(screen.getAllByRole('img')).toHaveLength(4)
  })

  it('gives the card one combined table and summary', () => {
    render(
      <Chart label='Entry by gate' source='Oztix scans.' size='full'>
        <SmallMultiples {...gatesExample} />
      </Chart>
    )
    expect(
      screen
        .getByRole('table', { name: 'Entry by gate' })
        .querySelectorAll('tbody tr')
    ).toHaveLength(48)
    expect(
      screen.getByRole('region', { name: 'Entry by gate' })
    ).toHaveAccessibleDescription(gatesExample.takeaway!)
  })

  it('renders on the server', () => {
    expect(renderToString(<SmallMultiples {...gatesExample} />)).toContain(
      'River entry'
    )
  })
})
