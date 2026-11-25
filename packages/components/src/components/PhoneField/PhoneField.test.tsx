import { createRef, useState } from 'react'

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { PhoneField, type PhoneFieldProps } from '.'
import { Field } from '../Field'

const number = () => screen.getByRole('textbox')
const picker = () => screen.getByRole('combobox', { name: /\+\d+$/ })

function renderInField(props: PhoneFieldProps = {}, field = {}) {
  return render(
    <Field {...field}>
      <Field.Label>Mobile number</Field.Label>
      <PhoneField {...props} />
      <Field.HelperText>We'll text you a code.</Field.HelperText>
      <Field.ErrorText>Enter a mobile number.</Field.ErrorText>
    </Field>
  )
}

describe('PhoneField', () => {
  it('reports what is typed as E.164, with its country and whether it is possible', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<PhoneField aria-label='Mobile' onValueChange={onValueChange} />)

    await user.type(number(), '0412 345 678')

    expect(onValueChange).toHaveBeenLastCalledWith('+61412345678', {
      country: 'AU',
      national: '412345678',
      possible: true
    })
    expect(number()).toHaveValue('0412 345 678')
  })

  it('reports a short number as not possible, and no number as empty', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<PhoneField aria-label='Mobile' onValueChange={onValueChange} />)

    await user.type(number(), '0412')
    expect(onValueChange).toHaveBeenLastCalledWith('+61412', {
      country: 'AU',
      national: '412',
      possible: false
    })

    await user.clear(number())
    expect(onValueChange).toHaveBeenLastCalledWith('', {
      country: 'AU',
      national: '',
      possible: false
    })
  })

  it('starts from defaultCountry', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <PhoneField
        aria-label='Mobile'
        defaultCountry='NZ'
        onValueChange={onValueChange}
      />
    )

    await user.type(number(), '021 123 4567')

    expect(onValueChange).toHaveBeenLastCalledWith(
      '+64211234567',
      expect.objectContaining({ country: 'NZ' })
    )
  })

  it('keeps the digits and changes the value when another country is chosen', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    const onCountryChange = vi.fn()
    render(
      <PhoneField
        aria-label='Mobile'
        countries={['AU', 'NZ', 'GB']}
        onValueChange={onValueChange}
        onCountryChange={onCountryChange}
      />
    )
    await user.type(number(), '021 123 4567')

    await user.click(picker())
    await user.click(await screen.findByRole('option', { name: /New Zealand/ }))

    expect(onCountryChange).toHaveBeenLastCalledWith('NZ')
    expect(onValueChange).toHaveBeenLastCalledWith(
      '+64211234567',
      expect.objectContaining({ country: 'NZ', possible: true })
    )
    expect(number()).toHaveValue('021 123 4567')
  })

  it.each([
    ['a name', 'king', 'United Kingdom'],
    ['a dial code', '+64', 'New Zealand']
  ])('finds a country by %s in the search', async (_, query, name) => {
    const user = userEvent.setup()
    render(<PhoneField aria-label='Mobile' countries={['AU', 'NZ', 'GB']} />)

    await user.click(picker())
    await user.type(
      await screen.findByRole('combobox', { name: 'Search countries' }),
      query
    )

    const options = await screen.findAllByRole('option')
    expect(options.map((option) => option.textContent)).toEqual([
      expect.stringContaining(name)
    ])
  })

  it('says so when the search matches no country', async () => {
    const user = userEvent.setup()
    render(
      <PhoneField
        aria-label='Mobile'
        countries={['AU', 'NZ']}
        searchLabel='Find a country'
        emptyMessage='Nothing matches'
      />
    )

    await user.click(picker())
    await user.type(
      await screen.findByRole('combobox', { name: 'Find a country' }),
      'zzz'
    )

    expect(await screen.findByText('Nothing matches')).toBeVisible()
    expect(screen.queryAllByRole('option')).toHaveLength(0)
  })

  it('switches country for a pasted international number and keeps the national part', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    const onCountryChange = vi.fn()
    render(
      <PhoneField
        aria-label='Mobile'
        onValueChange={onValueChange}
        onCountryChange={onCountryChange}
      />
    )

    await user.click(number())
    await user.paste('+64 21 123 4567')

    expect(onCountryChange).toHaveBeenLastCalledWith('NZ')
    expect(onValueChange).toHaveBeenLastCalledWith('+64211234567', {
      country: 'NZ',
      national: '211234567',
      possible: true
    })
    expect(number()).toHaveValue('21 123 4567')
    expect(picker()).toHaveAccessibleName('Country code: New Zealand +64')
  })

  it('shows a value it is given, in its country', () => {
    render(<PhoneField aria-label='Mobile' defaultValue='+64211234567' />)

    expect(number()).toHaveValue('021 123 4567')
    expect(picker()).toHaveAccessibleName('Country code: New Zealand +64')
  })

  it('follows a controlled value, and goes back when the change is refused', async () => {
    const user = userEvent.setup()
    function Controlled() {
      const [value, setValue] = useState('+61412345678')
      return (
        <>
          <PhoneField aria-label='Mobile' value={value} />
          <button onClick={() => setValue('+447400123456')}>UK</button>
          <button onClick={() => setValue('')}>Clear</button>
        </>
      )
    }
    render(<Controlled />)
    expect(number()).toHaveValue('0412 345 678')

    await user.type(number(), '9')
    expect(number()).toHaveValue('0412 345 678')

    await user.click(screen.getByRole('button', { name: 'UK' }))
    expect(number()).toHaveValue('7400123456')
    expect(picker()).toHaveAccessibleName('Country code: United Kingdom +44')

    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(number()).toHaveValue('')
  })

  it('follows a controlled country', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    const { rerender } = render(
      <PhoneField
        aria-label='Mobile'
        country='AU'
        onValueChange={onValueChange}
      />
    )
    await user.type(number(), '021 123 4567')

    rerender(
      <PhoneField
        aria-label='Mobile'
        country='NZ'
        onValueChange={onValueChange}
      />
    )

    expect(picker()).toHaveAccessibleName('Country code: New Zealand +64')
    await user.type(number(), ' ')
    expect(onValueChange).toHaveBeenLastCalledWith(
      '+64211234567',
      expect.objectContaining({ country: 'NZ' })
    )
  })

  it('narrows and orders the picker with countries', async () => {
    const user = userEvent.setup()
    render(<PhoneField aria-label='Mobile' countries={['NZ', 'AU', 'GB']} />)

    await user.click(picker())
    const options = await screen.findAllByRole('option')

    expect(options.map((option) => option.textContent)).toEqual([
      expect.stringContaining('New Zealand'),
      expect.stringContaining('Australia'),
      expect.stringContaining('United Kingdom')
    ])
  })

  it('names countries in the locale', () => {
    render(<PhoneField aria-label='Mobile' defaultCountry='DE' locale='de' />)

    expect(picker()).toHaveAccessibleName('Country code: Deutschland +49')
  })

  it('names the picker with countryLabel', () => {
    render(<PhoneField aria-label='Mobile' countryLabel='Ländervorwahl' />)

    expect(picker()).toHaveAccessibleName('Ländervorwahl: Australia +61')
  })

  it('submits the E.164 value under name', async () => {
    const user = userEvent.setup()
    const submitted = vi.fn()
    render(
      <form
        onSubmit={(event) => {
          event.preventDefault()
          submitted(Object.fromEntries(new FormData(event.currentTarget)))
        }}
      >
        <PhoneField aria-label='Mobile' name='mobile' />
        <button type='submit'>Save</button>
      </form>
    )

    await user.type(number(), '0412 345 678')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(submitted).toHaveBeenCalledWith({ mobile: '+61412345678' })
  })

  describe('in a Field', () => {
    it('groups both controls under the field label', () => {
      renderInField()

      expect(
        screen.getByRole('group', { name: 'Mobile number' })
      ).toContainElement(number())
      expect(
        screen.getByRole('group', { name: 'Mobile number' })
      ).toContainElement(picker())
    })

    it('names the number by the field label and the picker by its own', () => {
      renderInField()

      expect(number()).toHaveAccessibleName('Mobile number')
      expect(picker()).toHaveAccessibleName('Country code: Australia +61')
    })

    it('focuses the number when the label is clicked', async () => {
      const user = userEvent.setup()
      renderInField()

      await user.click(screen.getByText('Mobile number'))

      expect(number()).toHaveFocus()
    })

    it('describes and requires only the number', () => {
      renderInField({}, { required: true })

      expect(number()).toHaveAccessibleDescription("We'll text you a code.")
      expect(number()).toBeRequired()
      expect(picker()).not.toHaveAccessibleDescription()
      expect(picker()).not.toBeRequired()
    })

    it('marks only the number invalid, with the error as its description', () => {
      renderInField({}, { invalid: true })

      expect(number()).toBeInvalid()
      expect(number()).toHaveAccessibleDescription('Enter a mobile number.')
      expect(picker()).not.toBeInvalid()
    })

    it('disables both controls', () => {
      renderInField({}, { disabled: true })

      expect(number()).toBeDisabled()
      expect(picker()).toBeDisabled()
    })
  })

  function submitted(field: React.ReactNode) {
    const onSubmit = vi.fn()
    render(
      <>
        <form
          id='checkout'
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit(Object.fromEntries(new FormData(event.currentTarget)))
          }}
        >
          <button type='submit'>Save</button>
        </form>
        {field}
      </>
    )
    return onSubmit
  }

  it('submits a number it was given, untouched, from outside its form', async () => {
    const user = userEvent.setup()
    const onSubmit = submitted(
      <PhoneField
        aria-label='Mobile'
        name='mobile'
        form='checkout'
        defaultValue='+61412345678'
      />
    )

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSubmit).toHaveBeenCalledWith({ mobile: '+61412345678' })
  })

  it('lets the number name its country over the country it is given', async () => {
    const user = userEvent.setup()
    const onSubmit = submitted(
      <PhoneField
        aria-label='Mobile'
        name='mobile'
        form='checkout'
        country='AU'
        defaultValue='+64211234567'
      />
    )

    expect(picker()).toHaveAccessibleName('Country code: New Zealand +64')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).toHaveBeenCalledWith({ mobile: '+64211234567' })
  })

  it('shows and submits what it reports when a paste changes a given country', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    const onSubmit = submitted(
      <PhoneField
        aria-label='Mobile'
        name='mobile'
        form='checkout'
        country='AU'
        onValueChange={onValueChange}
      />
    )

    await user.click(number())
    await user.paste('0064 21 123 4567')

    expect(onValueChange).toHaveBeenLastCalledWith(
      '+64211234567',
      expect.objectContaining({ country: 'NZ' })
    )
    expect(number()).toHaveValue('21 123 4567')
    expect(picker()).toHaveAccessibleName('Country code: New Zealand +64')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).toHaveBeenCalledWith({ mobile: '+64211234567' })
  })

  it('keeps a chosen country that shares the pasted dial code', async () => {
    const user = userEvent.setup()
    const onCountryChange = vi.fn()
    render(
      <PhoneField
        aria-label='Mobile'
        defaultCountry='CA'
        onCountryChange={onCountryChange}
      />
    )

    await user.click(number())
    await user.paste('+1 416 555 0123')

    expect(picker()).toHaveAccessibleName('Country code: Canada +1')
    expect(onCountryChange).not.toHaveBeenCalled()
  })

  it('follows a dial code as it is typed, without touching the text', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<PhoneField aria-label='Mobile' onValueChange={onValueChange} />)

    await user.type(number(), '+64 21 123 4567')

    expect(number()).toHaveValue('+64 21 123 4567')
    expect(picker()).toHaveAccessibleName('Country code: New Zealand +64')
    expect(onValueChange).toHaveBeenLastCalledWith('+64211234567', {
      country: 'NZ',
      national: '211234567',
      possible: true
    })
  })

  it('keeps every digit when a plus is typed in front of a number', async () => {
    const user = userEvent.setup()
    render(<PhoneField aria-label='Mobile' />)
    await user.type(number(), '412 345 678')

    await user.type(number(), '+', {
      initialSelectionStart: 0,
      initialSelectionEnd: 0
    })

    expect(number()).toHaveValue('+412 345 678')
  })

  it('swaps a typed dial code for the country picked after it', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <PhoneField
        aria-label='Mobile'
        countries={['AU', 'NZ']}
        onValueChange={onValueChange}
      />
    )
    await user.type(number(), '+64 412 345 678')

    await user.click(picker())
    await user.click(await screen.findByRole('option', { name: /Australia/ }))

    expect(number()).toHaveValue('412 345 678')
    expect(onValueChange).toHaveBeenLastCalledWith(
      '+61412345678',
      expect.objectContaining({ country: 'AU' })
    )
  })

  it('keeps a number whose dial code it does not know', async () => {
    const user = userEvent.setup()
    const onSubmit = submitted(
      <PhoneField
        aria-label='Mobile'
        name='mobile'
        form='checkout'
        defaultValue='+80012345678'
      />
    )

    expect(number()).toHaveValue('+80012345678')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).toHaveBeenCalledWith({ mobile: '+80012345678' })
  })

  it.each(['', 'AUS', 'xx'])(
    'falls back to Australia for the country %j',
    (code) => {
      render(<PhoneField aria-label='Mobile' defaultCountry={code} />)
      expect(picker()).toHaveAccessibleName('Country code: Australia +61')
    }
  )

  it('names countries in Australian English for a locale it cannot read', () => {
    render(<PhoneField aria-label='Mobile' locale='en_AU' />)
    expect(picker()).toHaveAccessibleName('Country code: Australia +61')
  })

  it('shows a country that countries leaves out when the number is from there', () => {
    render(
      <PhoneField
        aria-label='Mobile'
        countries={['AU', 'NZ']}
        defaultValue='+447400123456'
      />
    )
    expect(picker()).toHaveAccessibleName('Country code: United Kingdom +44')
  })

  it('reads countries in any case, once each, and skips codes it does not know', async () => {
    const user = userEvent.setup()
    render(
      <PhoneField aria-label='Mobile' countries={['nz', 'xx', 'NZ', 'au']} />
    )

    await user.click(picker())
    const options = await screen.findAllByRole('option')

    expect(options.map((option) => option.textContent)).toEqual([
      expect.stringContaining('New Zealand'),
      expect.stringContaining('Australia')
    ])
  })

  it('finds a country by its two-letter code and marks the chosen one', async () => {
    const user = userEvent.setup()
    render(<PhoneField aria-label='Mobile' countries={['AU', 'NZ', 'GB']} />)

    await user.click(picker())
    expect(
      await screen.findByRole('option', { name: /Australia/ })
    ).toHaveAttribute('aria-selected', 'true')
    await user.type(
      screen.getByRole('combobox', { name: 'Search countries' }),
      'gb'
    )

    const options = await screen.findAllByRole('option')
    expect(options.map((option) => option.textContent)).toEqual([
      expect.stringContaining('United Kingdom')
    ])
  })

  it('opens from the keyboard with focus in a named search', async () => {
    const user = userEvent.setup()
    render(<PhoneField aria-label='Mobile' countries={['AU', 'NZ']} />)

    await user.tab()
    await user.keyboard('{Enter}')

    expect(
      await screen.findByRole('dialog', { name: 'Country code' })
    ).toBeVisible()
    await waitFor(() =>
      expect(
        screen.getByRole('combobox', { name: 'Search countries' })
      ).toHaveFocus()
    )
  })

  it('keeps the field label, error and required off the search', async () => {
    const user = userEvent.setup()
    renderInField(
      { countries: ['AU', 'NZ'] },
      { invalid: true, required: true }
    )

    await user.click(picker())
    const search = await screen.findByRole('combobox', {
      name: 'Search countries'
    })

    expect(search).not.toBeInvalid()
    expect(search).not.toBeRequired()
    expect(search).not.toHaveAccessibleDescription()
    expect(search.id).not.toBe(number().id)
  })

  it('shows a read only number and keeps its country', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <PhoneField
        aria-label='Mobile'
        readOnly
        countries={['AU', 'NZ']}
        defaultValue='+61412345678'
        onValueChange={onValueChange}
      />
    )

    expect(number()).toHaveAttribute('readonly')
    await user.click(picker())
    const other = screen.queryByRole('option', { name: /New Zealand/ })
    if (other) await user.click(other)

    expect(picker()).toHaveAccessibleName('Country code: Australia +61')
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('turns off both controls and leaves a form when disabled', async () => {
    const user = userEvent.setup()
    const onSubmit = submitted(
      <PhoneField
        aria-label='Mobile'
        name='mobile'
        form='checkout'
        defaultValue='+61412345678'
        disabled
      />
    )

    expect(number()).toBeDisabled()
    expect(picker()).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).toHaveBeenCalledWith({})
  })

  it('puts className on the group, and ref and placeholder on the number', () => {
    const ref = createRef<HTMLInputElement>()
    render(
      <PhoneField
        aria-label='Mobile'
        className='max-w-sm'
        placeholder='0400 000 000'
        ref={ref}
      />
    )

    expect(screen.getByRole('group', { name: 'Mobile' })).toHaveClass(
      'max-w-sm'
    )
    expect(ref.current).toBe(number())
    expect(number()).toHaveAttribute('placeholder', '0400 000 000')
  })

  it('marks the group invalid outside a Field', () => {
    render(<PhoneField aria-label='Mobile' aria-invalid />)

    expect(screen.getByRole('group', { name: 'Mobile' })).toBeInvalid()
  })

  it('reaches the picker, then the number, by Tab', async () => {
    const user = userEvent.setup()
    render(<PhoneField aria-label='Mobile' />)

    await user.tab()
    expect(picker()).toHaveFocus()
    await user.tab()
    expect(number()).toHaveFocus()
  })

  it('is a telephone input that autofills a whole number', () => {
    render(<PhoneField aria-label='Mobile' />)

    expect(number()).toHaveAttribute('type', 'tel')
    expect(number()).toHaveAttribute('autocomplete', 'tel')
  })
})
