import { useState } from 'react'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { DateField } from '.'
import { formatDate, readDate } from '../../pickers/readDate'
import { Field } from '../Field'

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
    expect(screen.getByRole('combobox', { name: 'Show date' })).toHaveValue(
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
    const input = screen.getByRole('combobox')
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
    await userEvent.type(screen.getByRole('combobox'), '1/12{Enter}')
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
    const input = screen.getByRole('combobox')
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
    expect(screen.getByRole('combobox')).not.toHaveAttribute('name')
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
    const input = screen.getByRole('combobox')
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
    await userEvent.click(screen.getByRole('combobox'))
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
    const input = screen.getByRole('combobox')
    await userEvent.clear(input)
    await userEvent.type(input, 'someday{Enter}')
    expect(input).toHaveValue('someday')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(onValueChange).toHaveBeenLastCalledWith(null)
  })

  it('fails native validation while its text names no date', async () => {
    render(<DateField aria-label='Show date' today={TODAY} required />)
    const input = screen.getByRole<HTMLInputElement>('combobox')
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
    expect(screen.getByRole('combobox')).toHaveValue(
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

  it('has applied unreadable text by the time onBlur runs', async () => {
    const seen: [boolean, ReturnType<FormData['get']>][] = []
    render(
      <form>
        <DateField
          aria-label='Show date'
          name='showDate'
          today={TODAY}
          defaultValue='2026-11-27'
          onBlur={(event) =>
            seen.push([
              event.currentTarget.validity.valid,
              new FormData(event.currentTarget.form!).get('showDate')
            ])
          }
        />
      </form>
    )
    const input = screen.getByRole('combobox')
    await userEvent.clear(input)
    await userEvent.type(input, 'someday')
    await userEvent.tab()
    expect(seen).toEqual([[false, '']])
  })

  it('is valid again once Escape drops unreadable text', async () => {
    render(<DateField aria-label='Show date' today={TODAY} />)
    const input = screen.getByRole<HTMLInputElement>('combobox')
    await userEvent.type(input, 'someday{Enter}')
    await userEvent.type(input, 'x{Escape}')
    expect(input.validity.valid).toBe(true)
  })

  it('keeps a callback ref attached while typing', async () => {
    const ref = vi.fn()
    render(<DateField aria-label='Show date' ref={ref} />)
    await userEvent.type(screen.getByRole('combobox'), '14 mar')
    expect(ref).toHaveBeenCalledTimes(1)
  })

  it('leaves Enter to an input method that is composing', () => {
    const onValueChange = vi.fn()
    render(
      <DateField
        aria-label='Show date'
        today={TODAY}
        onValueChange={onValueChange}
      />
    )
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: '14 mar' } })
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 })
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('goes back to the value on Escape', async () => {
    render(
      <DateField
        aria-label='Show date'
        today={TODAY}
        defaultValue='2026-11-27'
      />
    )
    const input = screen.getByRole('combobox')
    await userEvent.clear(input)
    // The first Escape closes the suggestions.
    await userEvent.type(input, '14 mar{Escape}{Escape}')
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
    const input = screen.getByRole('combobox')
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
    await userEvent.clear(screen.getByRole('combobox'))
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
    const input = screen.getByRole('combobox')
    expect(input).toBeEnabled()
    await userEvent.type(input, '1 oct{Enter}')
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('marks itself invalid', () => {
    render(<DateField aria-label='Show date' invalid />)
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true')
  })

  it('turns off with disabled', () => {
    render(<DateField aria-label='Show date' disabled />)
    expect(screen.getByRole('combobox')).toBeDisabled()
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
      const input = screen.getByRole('combobox')
      await userEvent.clear(input)
      await userEvent.type(input, 'someday')
      await userEvent.click(screen.getByRole('button', { name: 'Christmas' }))
      expect(input).toHaveValue('Fri 25 Dec 2026')
      expect(input).not.toHaveAttribute('aria-invalid')
    })

    it('keeps unreadable text when the parent takes the null', async () => {
      render(<Controlled initial='2026-11-27' />)
      const input = screen.getByRole('combobox')
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
          <p id='venue-note'>Wobbly Teacup Room is closed Mondays</p>
        </Field>
      )
      expect(screen.getByLabelText('Show date')).toHaveAccessibleDescription(
        'Type a date Wobbly Teacup Room is closed Mondays'
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

  describe('suggestions', () => {
    const options = () =>
      screen.queryAllByRole('option').map((option) => option.textContent)

    it('hints at what can be typed when focused empty, highlighting none', async () => {
      render(<DateField aria-label='Show date' today={TODAY} />)
      const input = screen.getByRole('combobox', { name: 'Show date' })
      await userEvent.click(input)
      await screen.findByRole('listbox')
      expect(options()).toEqual([
        'TodayWed 7 Oct 2026',
        'TomorrowThu 8 Oct 2026',
        'Next FriFri 16 Oct 2026',
        'In 2 weeksWed 21 Oct 2026',
        'End of monthSat 31 Oct 2026',
        '1 NovSun 1 Nov 2026'
      ])
      expect(input).not.toHaveAttribute('aria-activedescendant')
      expect(input).toHaveAttribute('aria-expanded', 'true')
    })

    it('submits the form on Enter while only hints show', async () => {
      const onSubmit = vi.fn((event) => event.preventDefault())
      render(
        <form onSubmit={onSubmit}>
          <DateField aria-label='Show date' today={TODAY} />
          <button type='submit'>Save</button>
        </form>
      )
      await userEvent.click(screen.getByRole('combobox'))
      await screen.findByRole('listbox')
      await userEvent.keyboard('{Enter}')
      expect(onSubmit).toHaveBeenCalledTimes(1)
    })

    it('narrows as you type, highlighting the first so Enter takes it', async () => {
      const onValueChange = vi.fn()
      render(
        <DateField
          aria-label='Show date'
          today={TODAY}
          onValueChange={onValueChange}
        />
      )
      const input = screen.getByRole('combobox')
      await userEvent.type(input, 'fr')
      const first = await screen.findByRole('option', { name: /^Fri/ })
      expect(options()).toEqual([
        'FriFri 9 Oct 2026Enter',
        'Next FriFri 16 Oct 2026'
      ])
      expect(first).toHaveAttribute('data-highlighted')
      expect(input).toHaveAttribute('aria-activedescendant', first.id)
      await userEvent.keyboard('{Enter}')
      expect(onValueChange).toHaveBeenCalledTimes(1)
      expect(onValueChange).toHaveBeenCalledWith('2026-10-09')
      expect(input).toHaveValue('Fri 9 Oct 2026')
      await waitFor(() =>
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      )
    })

    it('takes a suggestion that is pressed', async () => {
      const onValueChange = vi.fn()
      render(
        <DateField
          aria-label='Show date'
          today={TODAY}
          onValueChange={onValueChange}
        />
      )
      await userEvent.click(screen.getByRole('combobox'))
      await userEvent.click(
        await screen.findByRole('option', { name: /^Tomorrow/ })
      )
      expect(onValueChange).toHaveBeenCalledWith('2026-10-08')
      expect(screen.getByRole('combobox')).toHaveValue('Thu 8 Oct 2026')
      expect(screen.getByRole('combobox')).toHaveFocus()
    })

    it('closes on Escape and keeps the typed text', async () => {
      const onValueChange = vi.fn()
      render(
        <DateField
          aria-label='Show date'
          today={TODAY}
          defaultValue='2026-11-27'
          onValueChange={onValueChange}
        />
      )
      const input = screen.getByRole('combobox')
      await userEvent.clear(input)
      await userEvent.type(input, 'tom')
      await screen.findByRole('listbox')
      await userEvent.keyboard('{Escape}')
      await waitFor(() =>
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      )
      expect(input).toHaveValue('tom')
      expect(onValueChange).not.toHaveBeenCalled()
      await userEvent.keyboard('{Escape}')
      expect(input).toHaveValue('Fri 27 Nov 2026')
    })

    it('still commits typed text on blur while the list shows', async () => {
      const onValueChange = vi.fn()
      render(
        <>
          <DateField
            aria-label='Show date'
            today={TODAY}
            onValueChange={onValueChange}
          />
          <button type='button'>Next</button>
        </>
      )
      await userEvent.type(screen.getByRole('combobox'), '14 mar')
      await screen.findByRole('listbox')
      await userEvent.tab()
      expect(onValueChange).toHaveBeenCalledWith('2027-03-14')
      await waitFor(() =>
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      )
    })

    it('commits typed text on Enter when nothing is suggested', async () => {
      const onValueChange = vi.fn()
      render(
        <DateField
          aria-label='Show date'
          today={TODAY}
          defaultValue='2026-11-27'
          onValueChange={onValueChange}
        />
      )
      const input = screen.getByRole('combobox')
      await userEvent.clear(input)
      await userEvent.type(input, 'someday{Enter}')
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      expect(onValueChange).toHaveBeenCalledWith(null)
      expect(input).toHaveAttribute('aria-invalid', 'true')
    })

    it('closes once the text is cleared, so Enter takes nothing', async () => {
      const onValueChange = vi.fn()
      render(
        <DateField
          aria-label='Show date'
          today={TODAY}
          onValueChange={onValueChange}
        />
      )
      const input = screen.getByRole('combobox')
      await userEvent.type(input, 'fr')
      await screen.findByRole('option', { name: /^Next Fri/ })
      await userEvent.clear(input)
      await waitFor(() =>
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      )
      await userEvent.keyboard('{Enter}')
      expect(onValueChange).not.toHaveBeenCalled()
    })

    it('leaves out disabled dates', async () => {
      render(
        <DateField
          aria-label='Show date'
          today={TODAY}
          disabled={{ before: '2026-10-10' }}
        />
      )
      await userEvent.click(screen.getByRole('combobox'))
      await screen.findByRole('listbox')
      expect(options()).toEqual([
        'Next FriFri 16 Oct 2026',
        'In 2 weeksWed 21 Oct 2026',
        'End of monthSat 31 Oct 2026',
        '1 NovSun 1 Nov 2026'
      ])
    })

    it('reads the hints in the time zone', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      // 2am Wednesday in Perth, still Tuesday in UTC.
      vi.setSystemTime(new Date('2026-10-06T18:00:00Z'))
      try {
        render(<DateField aria-label='Show date' timeZone='Australia/Perth' />)
        await userEvent.click(screen.getByRole('combobox'))
        expect(
          await screen.findByRole('option', { name: /^Today/ })
        ).toHaveTextContent('TodayWed 7 Oct 2026')
      } finally {
        vi.useRealTimers()
      }
    })

    it('stays shut when Escape puts back a date after unreadable text', async () => {
      render(
        <DateField
          aria-label='Show date'
          today={TODAY}
          defaultValue='2026-11-27'
        />
      )
      const input = screen.getByRole('combobox')
      await userEvent.clear(input)
      await userEvent.type(input, 'someday{Enter}{Escape}')
      expect(input).toHaveValue('Fri 27 Nov 2026')
      expect(input).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByRole('listbox')).toBeNull()
    })

    it('stays quiet when weekStart is out of range', async () => {
      render(<DateField aria-label='Show date' today={TODAY} weekStart={0} />)
      await userEvent.click(screen.getByRole('combobox'))
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('suggests nothing when read only or disabled', async () => {
      render(
        <>
          <DateField aria-label='Read only' today={TODAY} readOnly />
          <DateField aria-label='Off' today={TODAY} disabled />
          <DateField aria-label='Live' today={TODAY} />
        </>
      )
      const readOnly = screen.getByRole('combobox', { name: 'Read only' })
      await userEvent.click(readOnly)
      await userEvent.keyboard('{ArrowDown}')
      expect(readOnly).toHaveAttribute('aria-expanded', 'false')
      const off = screen.getByRole('combobox', { name: 'Off' })
      expect(off).toBeDisabled()
      await userEvent.click(off)
      expect(off).toHaveAttribute('aria-expanded', 'false')
      // The live field opens in the same way, so the checks above can fail.
      const live = screen.getByRole('combobox', { name: 'Live' })
      await userEvent.click(live)
      await waitFor(() => expect(live).toHaveAttribute('aria-expanded', 'true'))
      expect(screen.getAllByRole('listbox')).toHaveLength(1)
    })
  })
})
