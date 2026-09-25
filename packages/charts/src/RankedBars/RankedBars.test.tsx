import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { RankedBars } from '.'
import { Chart } from '../Chart'
import { channelExample } from './examples'

describe('RankedBars', () => {
  it('renders on the server with live paints', () => {
    const html = renderToString(<RankedBars {...channelExample} />)
    expect(html).toContain('var(--chart-highlight)')
    expect(html).toContain(`aria-label="${channelExample.takeaway}"`)
  })

  it('names the plot and puts every row in the card table', () => {
    render(
      <Chart label='Channels' source='Oztix sales.' size='md'>
        <RankedBars {...channelExample} />
      </Chart>
    )
    expect(
      screen.getByRole('img', { name: channelExample.takeaway })
    ).toBeInTheDocument()
    expect(
      screen
        .getByRole('table', { name: 'Channels' })
        .querySelectorAll('tbody tr')
    ).toHaveLength(10)
  })

  it('shows the empty copy with nothing to rank', () => {
    render(<RankedBars data={[]} x='channel' y='orders' />)
    expect(screen.getByText('Nothing to rank yet')).toBeInTheDocument()
  })
})
