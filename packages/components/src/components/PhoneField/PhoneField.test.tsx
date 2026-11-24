import { useState } from 'react'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { PhoneField, type PhoneFieldProps } from '.'
import { Field } from '../Field'

const number = () => screen.getByRole('textbox')
const picker = () => screen.getByRole('combobox')

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

  it('lists every country by name when countries is left off', async () => {
    const user = userEvent.setup()
    render(<PhoneField aria-label='Mobile' />)

    await user.click(picker())
    const names = (await screen.findAllByRole('option')).map(
      (option) => option.textContent ?? ''
    )

    expect(names.length).toBeGreaterThan(230)
    expect(names.findIndex((name) => name.includes('Australia'))).toBeLessThan(
      names.findIndex((name) => name.includes('New Zealand'))
    )
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

  it('reaches the picker, then the number, by Tab', async () => {
    const user = userEvent.setup()
    render(<PhoneField aria-label='Mobile' />)

    await user.tab()
    expect(picker()).toHaveFocus()
    await user.tab()
    expect(number()).toHaveFocus()
  })

  it('is a telephone input that autofills the national number', () => {
    render(<PhoneField aria-label='Mobile' />)

    expect(number()).toHaveAttribute('type', 'tel')
    expect(number()).toHaveAttribute('autocomplete', 'tel-national')
  })
})
