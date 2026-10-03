import { useState } from 'react'

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { DatePicker } from '.'
import { Field } from '../Field'

// Wed 7 Oct 2026.
const TODAY = '2026-10-07'
const MELBOURNE = 'Australia/Melbourne'

const day = (date: string) =>
  document.querySelector<HTMLButtonElement>(
    `[data-slot="calendar"] button[data-date="${date}"]:not([data-outside])`
  )!

describe('DatePicker', () => {
  it('shows a typed field and a button to choose from a calendar', () => {
    render(
      <DatePicker
        aria-label='Show date'
        today={TODAY}
        defaultValue='2026-11-27'
      />
    )
    expect(screen.getByRole('textbox', { name: 'Show date' })).toHaveValue(
      'Fri 27 Nov 2026'
    )
    expect(
      screen.getByRole('button', { name: 'Choose date' })
    ).toBeInTheDocument()
  })

  it('commits typed words as a plain date', async () => {
    const onValueChange = vi.fn()
    render(
      <DatePicker
        aria-label='Show date'
        today={TODAY}
        onValueChange={onValueChange}
      />
    )
    await userEvent.type(screen.getByRole('textbox'), 'next fri{Enter}')
    expect(onValueChange).toHaveBeenCalledWith('2026-10-16')
  })

  it('chooses a day from the calendar and closes', async () => {
    const onValueChange = vi.fn()
    render(
      <DatePicker
        aria-label='Show date'
        today={TODAY}
        defaultValue='2026-10-07'
        onValueChange={onValueChange}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Choose date' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('grid')).toBeInTheDocument()
    await userEvent.click(day('2026-10-23'))
    expect(onValueChange).toHaveBeenCalledWith('2026-10-23')
    expect(screen.getByRole('textbox')).toHaveValue('Fri 23 Oct 2026')
    await vi.waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
  })

  it('closes when the chosen day is pressed again, keeping it', async () => {
    const onValueChange = vi.fn()
    render(
      <DatePicker
        aria-label='Show date'
        today={TODAY}
        defaultValue='2026-10-23'
        onValueChange={onValueChange}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Choose date' }))
    await screen.findByRole('dialog')
    await userEvent.click(day('2026-10-23'))
    await vi.waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
    expect(onValueChange).not.toHaveBeenCalled()
    expect(screen.getByRole('textbox')).toHaveValue('Fri 23 Oct 2026')
  })

  it('opens the calendar on the typed date', async () => {
    render(<DatePicker aria-label='Show date' today={TODAY} />)
    await userEvent.type(screen.getByRole('textbox'), '14 mar{Enter}')
    await userEvent.click(screen.getByRole('button', { name: 'Choose date' }))
    await screen.findByRole('dialog')
    expect(day('2027-03-14')).toHaveAttribute('data-selected')
  })

  it('passes disabled matchers to the calendar and the typed field', async () => {
    render(
      <DatePicker
        aria-label='Show date'
        today={TODAY}
        disabled={{ before: TODAY }}
      />
    )
    const input = screen.getByRole('textbox')
    await userEvent.type(input, '1 oct{Enter}')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Choose date' }))
    await screen.findByRole('dialog')
    expect(day('2026-10-06')).toHaveAttribute('aria-disabled', 'true')
  })

  it.each(['disabled', 'readOnly'])(
    'can’t change from an open calendar while %s',
    (state) => {
      render(
        <DatePicker
          aria-label='Show date'
          today={TODAY}
          defaultValue='2026-10-23'
          open
          {...{ [state]: true }}
        />
      )
      expect(day('2026-10-24')).toHaveAttribute('aria-disabled', 'true')
    }
  )

  it('turns off the field and the button with disabled', () => {
    render(<DatePicker aria-label='Show date' disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Choose date' })).toBeDisabled()
  })

  it('submits a controlled value in the shape of its granularity', () => {
    const { container } = render(
      <form>
        <DatePicker
          aria-label='Doors'
          granularity='minute'
          timeZone={MELBOURNE}
          name='doors'
          value='2026-11-27'
          onValueChange={() => {}}
        />
      </form>
    )
    expect(new FormData(container.querySelector('form')!).get('doors')).toBe('')
  })

  it('starts from defaultValue and ignores later ones', () => {
    const { rerender } = render(
      <DatePicker aria-label='Show date' defaultValue='2026-11-27' />
    )
    rerender(<DatePicker aria-label='Show date' defaultValue='2026-12-25' />)
    expect(screen.getByRole('textbox')).toHaveValue('Fri 27 Nov 2026')
  })

  it('submits the value under its name', () => {
    const { container } = render(
      <form>
        <DatePicker
          aria-label='Show date'
          name='showDate'
          defaultValue='2026-11-27'
        />
      </form>
    )
    expect(new FormData(container.querySelector('form')!).get('showDate')).toBe(
      '2026-11-27'
    )
  })

  it('keeps showing the value when a controlled parent refuses a change', async () => {
    render(
      <DatePicker
        aria-label='Show date'
        today={TODAY}
        value='2026-11-27'
        onValueChange={() => {}}
      />
    )
    const input = screen.getByRole('textbox')
    await userEvent.clear(input)
    await userEvent.type(input, '14 mar{Enter}')
    expect(input).toHaveValue('Fri 27 Nov 2026')
  })

  it('names a refused date in its own date style', async () => {
    render(
      <Field>
        <Field.Label>Show date</Field.Label>
        <DatePicker
          today={TODAY}
          dateStyle='medium'
          disabled={{ before: TODAY }}
        />
        <Field.ErrorText />
      </Field>
    )
    await userEvent.type(screen.getByLabelText('Show date'), '1 oct{Enter}')
    expect(screen.getByRole('alert').textContent).toBe(
      '1 Oct 2026 isn’t available'
    )
  })

  it('submits with a form it sits outside', () => {
    const { container } = render(
      <>
        <form id='booking' />
        <DatePicker
          aria-label='Show date'
          name='showDate'
          form='booking'
          defaultValue='2026-11-27'
        />
      </>
    )
    expect(new FormData(container.querySelector('form')!).get('showDate')).toBe(
      '2026-11-27'
    )
  })

  it('fails native validation while its time names nothing', async () => {
    render(
      <DatePicker
        aria-label='Doors'
        granularity='minute'
        timeZone={MELBOURNE}
      />
    )
    const time = screen.getByRole<HTMLInputElement>('textbox', { name: 'Time' })
    await userEvent.type(time, 'soon{Enter}')
    expect(time.validity.valid).toBe(false)
  })

  it('puts both inputs in a form it sits outside', () => {
    render(
      <DatePicker
        aria-label='Doors'
        granularity='minute'
        timeZone={MELBOURNE}
        form='booking'
      />
    )
    for (const name of ['Date', 'Time'])
      expect(screen.getByRole('textbox', { name })).toHaveAttribute(
        'form',
        'booking'
      )
  })

  it.each([
    ['Date', 'someday'],
    ['Time', 'soon']
  ])('submits nothing while its %s text names nothing', async (name, text) => {
    const { container } = render(
      <form>
        <DatePicker
          aria-label='Doors'
          granularity='minute'
          timeZone={MELBOURNE}
          today={TODAY}
          name='doors'
          value='2026-11-27T19:30:00+11:00'
          onValueChange={() => {}}
        />
      </form>
    )
    const input = screen.getByRole('textbox', { name })
    await userEvent.clear(input)
    await userEvent.type(input, `${text}{Enter}`)
    expect(new FormData(container.querySelector('form')!).get('doors')).toBe('')
  })

  it('drops a time error when the time goes away', async () => {
    const { rerender } = render(
      <Field>
        <Field.Label>Doors</Field.Label>
        <DatePicker granularity='minute' timeZone={MELBOURNE} today={TODAY} />
        <Field.ErrorText />
      </Field>
    )
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Time' }),
      'soon{Enter}'
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    rerender(
      <Field>
        <Field.Label>Doors</Field.Label>
        <DatePicker granularity='day' timeZone={MELBOURNE} today={TODAY} />
        <Field.ErrorText />
      </Field>
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('empties when a controlled parent clears a full value', async () => {
    function Reset() {
      const [value, setValue] = useState<string | null>('2026-11-27')
      return (
        <>
          <DatePicker
            aria-label='Show date'
            value={value}
            onValueChange={setValue}
          />
          <button type='button' onClick={() => setValue(null)}>
            Reset
          </button>
        </>
      )
    }
    render(<Reset />)
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(screen.getByRole('textbox')).toHaveValue('')
  })

  it('leaves a disabled value out of the form', () => {
    const { container } = render(
      <form>
        <DatePicker
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

  it('names the calendar popup', async () => {
    render(<DatePicker aria-label='Show date' today={TODAY} />)
    await userEvent.click(screen.getByRole('button', { name: 'Choose date' }))
    expect(
      await screen.findByRole('dialog', { name: 'Choose date' })
    ).toBeInTheDocument()
  })

  it('passes placeholder and inputRef to the date input', () => {
    const ref = { current: null as HTMLInputElement | null }
    render(
      <DatePicker
        aria-label='Show date'
        placeholder='14 Mar or next Fri'
        inputRef={ref}
      />
    )
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('placeholder', '14 Mar or next Fri')
    expect(ref.current).toBe(input)
  })

  describe('at minute granularity', () => {
    it('shows the time a daylight saving jump moves it to', async () => {
      const onValueChange = vi.fn()
      render(
        <DatePicker
          aria-label='Doors'
          granularity='minute'
          timeZone='Australia/Sydney'
          today={TODAY}
          defaultValue='2026-10-04'
          onValueChange={onValueChange}
        />
      )
      const time = screen.getByRole('textbox', { name: 'Time' })
      await userEvent.type(time, '2:30am{Enter}')
      expect(onValueChange).toHaveBeenCalledWith('2026-10-04T03:30:00+11:00')
      expect(time).toHaveValue('3:30am')
    })

    it('groups a date and a time under one name', () => {
      render(
        <DatePicker
          aria-label='Doors'
          granularity='minute'
          timeZone={MELBOURNE}
        />
      )
      const group = screen.getByRole('group', { name: 'Doors' })
      expect(
        within(group).getByRole('textbox', { name: 'Date' })
      ).toBeInTheDocument()
      expect(
        within(group).getByRole('textbox', { name: 'Time' })
      ).toBeInTheDocument()
    })

    it('shows an instant on the wall clock of timeZone', () => {
      render(
        <DatePicker
          aria-label='Doors'
          granularity='minute'
          timeZone={MELBOURNE}
          defaultValue='2026-11-27T08:30:00Z'
        />
      )
      expect(screen.getByRole('textbox', { name: 'Date' })).toHaveValue(
        'Fri 27 Nov 2026'
      )
      expect(screen.getByRole('textbox', { name: 'Time' })).toHaveValue(
        '7:30pm'
      )
    })

    it('emits the instant with the zone’s offset once both parts are known', async () => {
      const onValueChange = vi.fn()
      render(
        <DatePicker
          aria-label='Doors'
          granularity='minute'
          timeZone={MELBOURNE}
          today={TODAY}
          onValueChange={onValueChange}
        />
      )
      await userEvent.type(
        screen.getByRole('textbox', { name: 'Date' }),
        '27 nov{Enter}'
      )
      expect(onValueChange).not.toHaveBeenCalled()
      await userEvent.type(
        screen.getByRole('textbox', { name: 'Time' }),
        '7:30pm{Enter}'
      )
      expect(onValueChange).toHaveBeenCalledWith('2026-11-27T19:30:00+11:00')
    })

    it('keeps the time when a new day is chosen', async () => {
      const onValueChange = vi.fn()
      render(
        <DatePicker
          aria-label='Doors'
          granularity='minute'
          timeZone={MELBOURNE}
          today={TODAY}
          defaultValue='2026-10-07T19:30:00+11:00'
          onValueChange={onValueChange}
        />
      )
      await userEvent.click(screen.getByRole('button', { name: 'Choose date' }))
      await screen.findByRole('dialog')
      await userEvent.click(day('2026-10-08'))
      expect(onValueChange).toHaveBeenCalledWith('2026-10-08T19:30:00+11:00')
    })

    it('shows nothing when a parent holding null refuses a full value', async () => {
      render(
        <DatePicker
          aria-label='Doors'
          granularity='minute'
          timeZone={MELBOURNE}
          today={TODAY}
          value={null}
          onValueChange={() => {}}
        />
      )
      const date = screen.getByRole('textbox', { name: 'Date' })
      await userEvent.type(date, '27 nov{Enter}')
      expect(date).toHaveValue('Fri 27 Nov 2026')
      await userEvent.type(
        screen.getByRole('textbox', { name: 'Time' }),
        '7:30pm{Enter}'
      )
      expect(date).toHaveValue('')
    })

    it('describes the group with a consumer’s description', () => {
      render(
        <>
          <DatePicker
            aria-label='Doors'
            granularity='minute'
            timeZone={MELBOURNE}
            aria-describedby='doors-note'
          />
          <p id='doors-note'>Melbourne time</p>
        </>
      )
      expect(screen.getByRole('group')).toHaveAccessibleDescription(
        'Melbourne time'
      )
    })

    it('doesn’t join a new date to an unreadable time', async () => {
      const onValueChange = vi.fn()
      render(
        <DatePicker
          aria-label='Doors'
          granularity='minute'
          timeZone={MELBOURNE}
          today={TODAY}
          value='2026-10-07T19:30:00+11:00'
          onValueChange={onValueChange}
        />
      )
      const time = screen.getByRole('textbox', { name: 'Time' })
      await userEvent.clear(time)
      await userEvent.type(time, 'soon{Enter}')
      onValueChange.mockClear()
      await userEvent.click(screen.getByRole('button', { name: 'Choose date' }))
      await screen.findByRole('dialog')
      await userEvent.click(day('2026-10-08'))
      expect(onValueChange).toHaveBeenLastCalledWith(null)
    })

    it('keeps a half-entered value when the parent holds null', async () => {
      function Controlled() {
        const [value, setValue] = useState<string | null>(null)
        return (
          <DatePicker
            aria-label='Doors'
            granularity='minute'
            timeZone={MELBOURNE}
            today={TODAY}
            value={value}
            onValueChange={setValue}
          />
        )
      }
      render(<Controlled />)
      const date = screen.getByRole('textbox', { name: 'Date' })
      await userEvent.type(date, '27 nov{Enter}')
      expect(date).toHaveValue('Fri 27 Nov 2026')
    })
  })

  describe('in a Field', () => {
    it('takes the label, disabled and invalid from Field', () => {
      render(
        <Field disabled invalid>
          <Field.Label>Show date</Field.Label>
          <DatePicker />
        </Field>
      )
      const input = screen.getByLabelText('Show date')
      expect(input).toBeDisabled()
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(screen.getByRole('button', { name: 'Choose date' })).toBeDisabled()
    })

    it('says why typed text is wrong in Field.ErrorText', async () => {
      render(
        <Field>
          <Field.Label>Show date</Field.Label>
          <DatePicker today={TODAY} />
          <Field.ErrorText />
        </Field>
      )
      await userEvent.type(screen.getByLabelText('Show date'), 'someday{Enter}')
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Enter a date, like 14 Mar or next Fri'
      )
    })

    it('names its group by the Field label at minute granularity', () => {
      render(
        <Field>
          <Field.Label>Doors</Field.Label>
          <DatePicker granularity='minute' timeZone={MELBOURNE} />
        </Field>
      )
      expect(screen.getByRole('group', { name: 'Doors' })).toBeInTheDocument()
    })
  })
})
