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

  it('names each panel by its own data, and carries the takeaway once', () => {
    const { container } = render(<SmallMultiples {...gatesExample} />)
    expect(
      screen.getByRole('group', { name: gatesExample.takeaway })
    ).toBeInTheDocument()
    expect(screen.getAllByRole('img')[0]).toHaveAccessibleName(
      'North gate. Scans peaked at 300 at 6pm on Sat 14 Nov'
    )
    expect(
      container.querySelectorAll(`[aria-label*="${gatesExample.takeaway}"]`)
    ).toHaveLength(1)
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
    expect(screen.queryByRole('group', { name: gatesExample.takeaway })).toBe(
      null
    )
  })

  it('renders on the server', () => {
    expect(renderToString(<SmallMultiples {...gatesExample} />)).toContain(
      'River entry'
    )
  })
})
