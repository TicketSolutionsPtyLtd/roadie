import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { TimeField } from '.'
import { Field } from '../Field'

describe('TimeField', () => {
  it('shows its value on a 12-hour clock', () => {
    render(<TimeField aria-label='Doors' defaultValue='19:30' />)
    expect(screen.getByRole('textbox', { name: 'Doors' })).toHaveValue('7:30pm')
  })

  it('shows its value on a 24-hour clock', () => {
    render(<TimeField aria-label='Doors' defaultValue='19:30' hourCycle={24} />)
    expect(screen.getByRole('textbox')).toHaveValue('19:30')
  })

  it.each([
    ['7:30pm', '19:30'],
    ['7pm', '19:00'],
    ['19:30', '19:30'],
    ['noon', '12:00']
  ])('commits %j as %j', async (text, time) => {
    const onValueChange = vi.fn()
    render(<TimeField aria-label='Doors' onValueChange={onValueChange} />)
    await userEvent.type(screen.getByRole('textbox'), text)
    await userEvent.tab()
    expect(onValueChange).toHaveBeenCalledWith(time)
  })

  it('refuses a time off the minute step', async () => {
    const onValueChange = vi.fn()
    render(
      <Field>
        <Field.Label>Doors</Field.Label>
        <TimeField minuteStep={15} onValueChange={onValueChange} />
        <Field.ErrorText />
      </Field>
    )
    const input = screen.getByLabelText('Doors')
    await userEvent.type(input, '7:32pm{Enter}')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Choose a time in 15-minute steps'
    )
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('steps by the minute step with the arrow keys', async () => {
    const onValueChange = vi.fn()
    render(
      <TimeField
        aria-label='Doors'
        defaultValue='19:30'
        minuteStep={15}
        onValueChange={onValueChange}
      />
    )
    const input = screen.getByRole('textbox')
    await userEvent.type(input, '{ArrowUp}')
    expect(onValueChange).toHaveBeenLastCalledWith('19:45')
    expect(input).toHaveValue('7:45pm')
    await userEvent.type(input, '{ArrowDown}{ArrowDown}')
    expect(onValueChange).toHaveBeenLastCalledWith('19:15')
  })

  it('commits a draft before stepping it', async () => {
    const onValueChange = vi.fn()
    render(
      <TimeField
        aria-label='Doors'
        minuteStep={15}
        onValueChange={onValueChange}
      />
    )
    await userEvent.type(screen.getByRole('textbox'), '7pm{ArrowUp}')
    expect(onValueChange).toHaveBeenCalledTimes(1)
    expect(onValueChange).toHaveBeenLastCalledWith('19:15')
  })

  it('submits HH:MM under its name', () => {
    const { container } = render(
      <form>
        <TimeField aria-label='Doors' name='doors' defaultValue='19:30' />
      </form>
    )
    expect(new FormData(container.querySelector('form')!).get('doors')).toBe(
      '19:30'
    )
  })

  it('takes disabled from Field', () => {
    render(
      <Field disabled>
        <Field.Label>Doors</Field.Label>
        <TimeField />
      </Field>
    )
    expect(screen.getByLabelText('Doors')).toBeDisabled()
  })
})
