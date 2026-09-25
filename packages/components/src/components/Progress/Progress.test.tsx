import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Progress } from '.'

const slot = (container: HTMLElement, name: string) =>
  container.querySelector<HTMLElement>(`[data-slot="${name}"]`)

describe('Progress', () => {
  it('is the same component bare and as Root', () => {
    expect(Progress).toBe(Progress.Root)
  })

  it('exposes a labelled progressbar', () => {
    render(<Progress value={40} label='Uploading' />)
    const bar = screen.getByRole('progressbar', { name: 'Uploading' })
    expect(bar).toHaveAttribute('aria-valuenow', '40')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
  })

  it('shows the label and the formatted value in the short form', () => {
    const { container } = render(<Progress value={40} label='Uploading' />)
    expect(slot(container, 'progress-label')).toHaveTextContent('Uploading')
    expect(slot(container, 'progress-value')).toHaveTextContent('40%')
  })

  it('fills the indicator to the value', () => {
    const { container } = render(<Progress value={40} aria-label='Upload' />)
    expect(slot(container, 'progress-indicator')?.style.width).toBe('40%')
  })

  it('renders only the track when there is no label', () => {
    const { container } = render(<Progress value={40} aria-label='Upload' />)
    expect(slot(container, 'progress-track')).toBeInTheDocument()
    expect(slot(container, 'progress-label')).not.toBeInTheDocument()
    expect(slot(container, 'progress-value')).not.toBeInTheDocument()
  })

  it('speaks and shows valueText', () => {
    const { container } = render(
      <Progress
        value={120}
        max={400}
        label='Importing attendees'
        valueText='120 of 400'
      />
    )
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuetext',
      '120 of 400'
    )
    expect(slot(container, 'progress-value')).toHaveTextContent('120 of 400')
    expect(slot(container, 'progress-indicator')?.style.width).toBe('30%')
  })

  it('keeps the default spoken value without valueText', () => {
    render(<Progress value={40} aria-label='Upload' />)
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuetext',
      '40%'
    )
  })

  it('keeps getAriaValueText without valueText', () => {
    render(
      <Progress
        value={40}
        aria-label='Upload'
        getAriaValueText={(_, value) => `${value} percent`}
      />
    )
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuetext',
      '40 percent'
    )
  })

  it('is indeterminate when value is null', () => {
    const { container } = render(
      <Progress value={null} label='Preparing export' />
    )
    const bar = screen.getByRole('progressbar', { name: 'Preparing export' })
    expect(bar).not.toHaveAttribute('aria-valuenow')
    expect(bar).toHaveAttribute('data-indeterminate')
    const indicator = slot(container, 'progress-indicator')
    expect(indicator).toHaveAttribute('data-indeterminate')
    expect(indicator).toHaveClass('data-[indeterminate]:animate-indeterminate')
    expect(indicator?.style.width).toBe('')
  })

  it('marks completion', () => {
    render(<Progress value={100} aria-label='Upload' />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('data-complete')
  })

  it('composes from parts', () => {
    const { container } = render(
      <Progress value={120} max={400} valueText='120 of 400'>
        <Progress.Label>Importing attendees</Progress.Label>
        <Progress.Value />
        <Progress.Track>
          <Progress.Indicator />
        </Progress.Track>
      </Progress>
    )
    expect(
      screen.getByRole('progressbar', { name: 'Importing attendees' })
    ).toBeInTheDocument()
    expect(slot(container, 'progress-value')).toHaveTextContent('120 of 400')
  })

  it('lets Value take its own text', () => {
    const { container } = render(
      <Progress value={2} max={5}>
        <Progress.Value>2 of 5 files</Progress.Value>
      </Progress>
    )
    expect(slot(container, 'progress-value')).toHaveTextContent('2 of 5 files')
  })

  it('matches the Meter track and takes its fill from the intent', () => {
    const { container } = render(<Progress value={40} aria-label='Upload' />)
    expect(slot(container, 'progress-track')).toHaveClass(
      'h-1.5',
      'rounded-full',
      'bg-(--intent-4)'
    )
    expect(slot(container, 'progress-indicator')).toHaveClass('bg-strong')
  })

  it('takes no intent unless asked', () => {
    const { container, rerender } = render(
      <Progress value={40} aria-label='Upload' />
    )
    expect(slot(container, 'progress')?.className).not.toMatch(/intent-/)

    rerender(<Progress value={40} aria-label='Upload' intent='danger' />)
    expect(slot(container, 'progress')).toHaveClass('intent-danger')
  })

  it('forwards attributes to the root', () => {
    const { container } = render(
      <Progress value={40} aria-label='Upload' id='upload-progress' />
    )
    expect(slot(container, 'progress')).toHaveAttribute('id', 'upload-progress')
  })
})
