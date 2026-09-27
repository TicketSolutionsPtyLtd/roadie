import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Funnel } from '.'
import { Chart } from '../Chart'
import { checkoutExample } from './examples'

describe('Funnel', () => {
  it('renders on the server with live paints', () => {
    const html = renderToString(<Funnel {...checkoutExample} />)
    expect(html).toContain('var(--chart-1)')
    expect(html).toContain(`aria-label="${checkoutExample.takeaway}"`)
  })

  it('names the plot and fills the card table', () => {
    render(
      <Chart label='Checkout' source='Oztix sales.' size='md'>
        <Funnel {...checkoutExample} />
      </Chart>
    )
    expect(
      screen.getByRole('img', { name: checkoutExample.takeaway })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: 'Dropped' })
    ).toBeInTheDocument()
  })

  it('shows the empty copy when no one started', () => {
    render(
      <Funnel
        steps={[
          { label: 'Joined waitlist', value: 0 },
          { label: 'Bought', value: 0 }
        ]}
      />
    )
    expect(screen.getByText('No one has started this yet')).toBeInTheDocument()
  })
})
