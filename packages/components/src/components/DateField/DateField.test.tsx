import { useState } from 'react'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { DateField } from '.'
import { Field } from '../Field'
import { formatDate, readDate } from './readDate'

// Wed 7 Oct 2026.
const TODAY = '2026-10-07'

describe('DateField', () => {
  it('shows its value formatted', () => {
    render(
      <DateField
        aria-label='Show date'
        today={TODAY}
        defaultValue='2026-11-27'
      />
    )
    expect(screen.getByRole('textbox', { name: 'Show date' })).toHaveValue(
      'Fri 27 Nov 2026'
    )
  })

  it('commits typed words on blur', async () => {
    const onValueChange = vi.fn()
    render(
      <DateField
        aria-label='Show date'
        today={TODAY}
        onValueChange={onValueChange}
      />
    )
    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'next fri')
    expect(onValueChange).not.toHaveBeenCalled()
    await userEvent.tab()
    expect(onValueChange).toHaveBeenCalledWith('2026-10-16')
    expect(input).toHaveValue('Fri 16 Oct 2026')
  })

  it('reads a slashed date day first', async () => {
    const onValueChange = vi.fn()
    render(
      <DateField
        aria-label='Show date'
        today={TODAY}
        onValueChange={onValueChange}
      />
    )
    await userEvent.type(screen.getByRole('textbox'), '1/12{Enter}')
    expect(onValueChange).toHaveBeenCalledWith('2026-12-01')
  })

  it('commits on Enter without submitting the form, then submits', async () => {
    const onSubmit = vi.fn((event) => event.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        <DateField aria-label='Show date' today={TODAY} name='showDate' />
        <button type='submit'>Save</button>
      </form>
    )
    const input = screen.getByRole('textbox')
    await userEvent.type(input, '14 mar{Enter}')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(input).toHaveValue('Sun 14 Mar 2027')
    await userEvent.type(input, '{Enter}')
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('submits the ISO date under its name', async () => {
    const { container } = render(
      <form>
        <DateField
          aria-label='Show date'
          name='showDate'
          defaultValue='2026-11-27'
        />
      </form>
    )
    const form = container.querySelector('form')!
    expect(new FormData(form).get('showDate')).toBe('2026-11-27')
    expect(screen.getByRole('textbox')).not.toHaveAttribute('name')
  })

  it('submits nothing while its text names no date', async () => {
    const { container } = render(
      <form>
        <DateField
          aria-label='Show date'
          name='showDate'
          today={TODAY}
          value='2026-11-27'
          onValueChange={() => {}}
        />
      </form>
    )
    const input = screen.getByRole('textbox')
    await userEvent.clear(input)
    await userEvent.type(input, 'someday{Enter}')
    expect(new FormData(container.querySelector('form')!).get('showDate')).toBe(
      ''
    )
  })

  it('leaves a disabled value out of the form', () => {
    const { container } = render(
      <form>
        <DateField
          aria-label='Show date'
          name='showDate'
          defaultValue='2026-11-27'
          disabled
        />
      </form>
    )
    expect(new FormData(container.querySelector('form')!).get('showDate')).toBe(
      null
    )
  })

  it('leaves the value alone when focused and left untouched', async () => {
    const onValueChange = vi.fn()
    render(
      <DateField
        aria-label='Show date'
        defaultValue='2026-11-27'
        onValueChange={onValueChange}
      />
    )
    await userEvent.click(screen.getByRole('textbox'))
    await userEvent.tab()
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('keeps unreadable text, marks it invalid and clears the value', async () => {
    const onValueChange = vi.fn()
    render(
      <DateField
        aria-label='Show date'
        today={TODAY}
        defaultValue='2026-11-27'
        onValueChange={onValueChange}
      />
    )
    const input = screen.getByRole('textbox')
    await userEvent.clear(input)
    await userEvent.type(input, 'someday{Enter}')
    expect(input).toHaveValue('someday')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(onValueChange).toHaveBeenLastCalledWith(null)
  })

  it('fails native validation while its text names no date', async () => {
    render(<DateField aria-label='Show date' today={TODAY} required />)
    const input = screen.getByRole<HTMLInputElement>('textbox')
    await userEvent.type(input, 'someday{Enter}')
    expect(input.validity.valid).toBe(false)
    expect(input.validationMessage).toBe(
      'Enter a date, like 14 Mar or next Fri'
    )
    await userEvent.clear(input)
    await userEvent.type(input, '14 mar{Enter}')
    expect(input.validity.valid).toBe(true)
  })

  it('names its months in the Gregorian calendar whatever the locale', () => {
    render(
      <DateField
        aria-label='Show date'
        locale='fa-IR'
        dateStyle='medium'
        defaultValue='2026-03-27'
      />
    )
    expect(screen.getByRole('textbox')).toHaveValue(
      formatDate('2026-03-27', { dateStyle: 'medium', locale: 'fa-IR' })
    )
    expect(
      readDate(
        formatDate('2026-03-27', { dateStyle: 'medium', locale: 'fa-IR' }),
        {
          today: TODAY,
          locale: 'fa-IR'
        }
      )
    ).toEqual({ value: '2026-03-27' })
  })

  it('is valid again once Escape drops unreadable text', async () => {
    render(<DateField aria-label='Show date' today={TODAY} />)
    const input = screen.getByRole<HTMLInputElement>('textbox')
    await userEvent.type(input, 'someday{Enter}')
    await userEvent.type(input, 'x{Escape}')
    expect(input.validity.valid).toBe(true)
  })

  it('keeps a callback ref attached while typing', async () => {
    const ref = vi.fn()
    render(<DateField aria-label='Show date' ref={ref} />)
    await userEvent.type(screen.getByRole('textbox'), '14 mar')
    expect(ref).toHaveBeenCalledTimes(1)
  })

  it('goes back to the value on Escape', async () => {
    render(
      <DateField
        aria-label='Show date'
        today={TODAY}
        defaultValue='2026-11-27'
      />
    )
    const input = screen.getByRole('textbox')
    await userEvent.clear(input)
    await userEvent.type(input, '14 mar{Escape}')
    expect(input).toHaveValue('Fri 27 Nov 2026')
  })

  it('puts back the last date on Escape after unreadable text', async () => {
    const onValueChange = vi.fn()
    render(
      <DateField
        aria-label='Show date'
        today={TODAY}
        defaultValue='2026-11-27'
        onValueChange={onValueChange}
      />
    )
    const input = screen.getByRole('textbox')
    await userEvent.clear(input)
    await userEvent.type(input, 'someday{Enter}{Escape}')
    expect(input).toHaveValue('Fri 27 Nov 2026')
    expect(onValueChange).toHaveBeenLastCalledWith('2026-11-27')
    expect(input).not.toHaveAttribute('aria-invalid')
  })

  it('empties to null', async () => {
    const onValueChange = vi.fn()
    render(
      <DateField
        aria-label='Show date'
        defaultValue='2026-11-27'
        onValueChange={onValueChange}
      />
    )
    await userEvent.clear(screen.getByRole('textbox'))
    await userEvent.tab()
    expect(onValueChange).toHaveBeenCalledWith(null)
  })

  it('refuses a disabled date', async () => {
    render(
      <DateField
        aria-label='Show date'
        today={TODAY}
        disabled={{ before: TODAY }}
      />
    )
    const input = screen.getByRole('textbox')
    expect(input).toBeEnabled()
    await userEvent.type(input, '1 oct{Enter}')
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('marks itself invalid', () => {
    render(<DateField aria-label='Show date' invalid />)
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
  })

  it('turns off with disabled', () => {
    render(<DateField aria-label='Show date' disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  describe('controlled', () => {
    function Controlled({ initial }: { initial: string | null }) {
      const [value, setValue] = useState(initial)
      return (
        <>
          <DateField
            aria-label='Show date'
            today={TODAY}
            value={value}
            onValueChange={setValue}
          />
          <button type='button' onClick={() => setValue('2026-12-25')}>
            Christmas
          </button>
          <output>{value ?? 'none'}</output>
        </>
      )
    }

    it('follows a value set from outside, dropping the draft', async () => {
      render(<Controlled initial='2026-11-27' />)
      const input = screen.getByRole('textbox')
      await userEvent.clear(input)
      await userEvent.type(input, 'someday')
      await userEvent.click(screen.getByRole('button', { name: 'Christmas' }))
      expect(input).toHaveValue('Fri 25 Dec 2026')
      expect(input).not.toHaveAttribute('aria-invalid')
    })

    it('keeps unreadable text when the parent takes the null', async () => {
      render(<Controlled initial='2026-11-27' />)
      const input = screen.getByRole('textbox')
      await userEvent.clear(input)
      await userEvent.type(input, 'someday{Enter}')
      expect(screen.getByRole('status')).toHaveTextContent('none')
      expect(input).toHaveValue('someday')
      expect(input).toHaveAttribute('aria-invalid', 'true')
    })
  })

  describe('in a Field', () => {
    it('takes the label, required and disabled from Field', () => {
      render(
        <Field required disabled>
          <Field.Label>Show date</Field.Label>
          <DateField />
        </Field>
      )
      const input = screen.getByLabelText('Show date')
      expect(input).toBeDisabled()
      expect(input).toHaveAttribute('aria-required', 'true')
    })

    it('takes invalid from Field', () => {
      render(
        <Field invalid>
          <Field.Label>Show date</Field.Label>
          <DateField />
          <Field.ErrorText>Choose a show date</Field.ErrorText>
        </Field>
      )
      const input = screen.getByLabelText('Show date')
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(input).toHaveAccessibleDescription('Choose a show date')
    })

    it('adds its own description to the Field’s', () => {
      render(
        <Field>
          <Field.Label>Show date</Field.Label>
          <DateField aria-describedby='venue-note' />
          <Field.HelperText>Type a date</Field.HelperText>
          <p id='venue-note'>The Tin Shed is closed Mondays</p>
        </Field>
      )
      expect(screen.getByLabelText('Show date')).toHaveAccessibleDescription(
        'Type a date The Tin Shed is closed Mondays'
      )
    })

    it('says why typed text is wrong in Field.ErrorText', async () => {
      render(
        <Field>
          <Field.Label>Show date</Field.Label>
          <DateField today={TODAY} />
          <Field.HelperText>Type a date or a day</Field.HelperText>
          <Field.ErrorText>Choose a show date</Field.ErrorText>
        </Field>
      )
      const input = screen.getByLabelText('Show date')
      expect(input).toHaveAccessibleDescription('Type a date or a day')
      await userEvent.type(input, 'someday{Enter}')
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Enter a date, like 14 Mar or next Fri'
      )
      expect(input).toHaveAccessibleDescription(
        'Enter a date, like 14 Mar or next Fri'
      )
      await userEvent.clear(input)
      await userEvent.type(input, '14 mar{Enter}')
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })
})
