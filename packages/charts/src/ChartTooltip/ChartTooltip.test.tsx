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
  it('leaves a keyless row, such as a total, without a swatch but aligned', () => {
    const { container } = render(
      <ChartTooltip
        rows={[
          { label: 'Total', value: '97', shape: 'none' },
          { label: 'Main gate', value: '48', color: 'red' }
        ]}
      />
    )
    const terms = container.querySelectorAll('dt')
    expect(terms[0]!.querySelector('svg')).toBeNull()
    expect(
      terms[0]!.querySelector('[data-slot=legend-key-space]')
    ).not.toBeNull()
    expect(terms[1]!.querySelector('svg')).not.toBeNull()
  })
})
