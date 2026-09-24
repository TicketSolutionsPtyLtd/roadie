import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Meter } from '.'

describe('Meter', () => {
  it('exposes its value as a meter', () => {
    render(<Meter label='Sell-through' value={1842} max={2400} />)
    const meter = screen.getByRole('meter', { name: 'Sell-through' })
    expect(meter).toHaveAttribute('aria-valuenow', '1842')
    expect(meter).toHaveAttribute('aria-valuemax', '2400')
    expect(meter).toHaveAttribute('aria-valuetext', '1,842 of 2,400')
  })

  it('clamps values past the maximum', () => {
    const { container } = render(<Meter label='Sold' value={3000} max={2400} />)
    const fill = container.querySelector<HTMLElement>(
      '[data-slot=meter-segment]'
    )!
    expect(fill.style.width).toBe('100%')
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '2400')
  })

  it('stacks segments with textures and clamps their total', () => {
    const { container } = render(
      <Meter
        label='Capacity'
        max={100}
        segments={[
          { value: 70, label: 'Sold' },
          { value: 50, label: 'Held', tone: 'context' }
        ]}
      />
    )
    const parts = container.querySelectorAll<HTMLElement>(
      '[data-slot=meter-segment]'
    )
    expect(parts[0]!.style.width).toBe('70%')
    expect(parts[1]!.style.width).toBe('30%')
    expect(parts[1]).toHaveAttribute('data-chart-texture', '2')
    expect(parts[1]).toHaveClass('bg-chart-context')
  })

  it('draws a target tick', () => {
    const { container } = render(
      <Meter label='Sold' value={50} max={100} target={85} />
    )
    expect(
      container.querySelector<HTMLElement>('[data-slot=meter-target]')!.style
        .left
    ).toBe('85%')
  })

  it('treats a zero maximum as empty with a valid aria range', () => {
    const { container } = render(<Meter label='Sold' value={5} max={0} />)
    expect(
      container.querySelector<HTMLElement>('[data-slot=meter-segment]')!.style
        .width
    ).toBe('0%')
    const meter = screen.getByRole('meter')
    expect(meter).toHaveAttribute('aria-valuemin', '0')
    expect(meter).toHaveAttribute('aria-valuemax', '1')
    expect(meter).toHaveAttribute('aria-valuenow', '0')
    expect(meter).toHaveAttribute('aria-valuetext', 'Not available')
  })

  it('treats a NaN maximum as zero with a valid aria range', () => {
    render(<Meter label='Sold' value={5} max={Number.NaN} />)
    const meter = screen.getByRole('meter')
    expect(meter).toHaveAttribute('aria-valuemax', '1')
    expect(meter).toHaveAttribute('aria-valuenow', '0')
    expect(meter).toHaveAttribute('aria-valuetext', 'Not available')
  })

  it('ignores a NaN segment value without corrupting the total', () => {
    render(
      <Meter
        label='Capacity'
        max={100}
        segments={[
          { value: Number.NaN, label: 'Broken' },
          { value: 40, label: 'Sold' }
        ]}
      />
    )
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '40')
  })
})
