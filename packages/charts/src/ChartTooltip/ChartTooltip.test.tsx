import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ChartTooltip } from '.'

describe('ChartTooltip', () => {
  it('shows label and value rows', () => {
    render(
      <ChartTooltip
        title='Fri 27 Nov'
        rows={[
          { label: 'This show', value: '61%' },
          { label: 'Similar shows', value: '52%', shape: 'band' }
        ]}
      />
    )
    expect(screen.getByText('Fri 27 Nov')).toBeInTheDocument()
    expect(screen.getByText('This show:')).toBeInTheDocument()
    expect(screen.getByText('61%')).toBeInTheDocument()
  })
})
