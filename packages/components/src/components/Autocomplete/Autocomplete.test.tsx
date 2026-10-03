import { useState } from 'react'

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import {
  Autocomplete,
  type AutocompleteProps,
  autocompleteInputGroupVariants
} from '.'
import { Field } from '../Field'

describe('Autocomplete', () => {
  it('Autocomplete and Autocomplete.Root are the same component reference', () => {
    expect(Autocomplete).toBe(Autocomplete.Root)
  })

  it('renders root component', () => {
    const { container } = render(
      <Autocomplete>
        <Autocomplete.InputGroup>
          <Autocomplete.Input placeholder='Search...' />
        </Autocomplete.InputGroup>
      </Autocomplete>
    )
    expect(container).toBeInTheDocument()
  })

  it('renders InputGroup with default variant classes', () => {
    const classes = autocompleteInputGroupVariants()
    expect(classes).toContain('emphasis-field')
    expect(classes).toContain('is-interactive-field-group')
    expect(classes).not.toContain('intent-neutral')
  })

  it('renders InputGroup with different intents', () => {
    expect(autocompleteInputGroupVariants({ intent: 'accent' })).toContain(
      'intent-accent'
    )
    expect(autocompleteInputGroupVariants({ intent: 'danger' })).toContain(
      'intent-danger'
    )
  })

  it('renders InputGroup with different emphasis', () => {
    expect(autocompleteInputGroupVariants({ emphasis: 'normal' })).toContain(
      'emphasis-field'
    )
    expect(autocompleteInputGroupVariants({ emphasis: 'subtle' })).toContain(
      'bg-subtle'
    )
  })

  it('renders InputGroup with different sizes', () => {
    expect(autocompleteInputGroupVariants({ size: 'sm' })).toContain('h-8')
    expect(autocompleteInputGroupVariants({ size: 'md' })).toContain('h-10')
    expect(autocompleteInputGroupVariants({ size: 'lg' })).toContain('h-12')
  })

  it('renders with custom className on InputGroup', () => {
    const classes = autocompleteInputGroupVariants({
      className: 'custom-class'
    })
    expect(classes).toContain('custom-class')
  })

  it('Autocomplete input gets aria attributes from Field context', () => {
    const { container } = render(
      <Field invalid required>
        <Field.Label>Address</Field.Label>
        <Autocomplete>
          <Autocomplete.InputGroup>
            <Autocomplete.Input placeholder='Start typing...' />
          </Autocomplete.InputGroup>
        </Autocomplete>
        <Field.ErrorText>Required</Field.ErrorText>
      </Field>
    )
    const input = container.querySelector('input')!
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-required', 'true')
  })

  it('standalone Autocomplete works without Field', () => {
    const { container } = render(
      <Autocomplete>
        <Autocomplete.InputGroup>
          <Autocomplete.Input placeholder='Search...' />
        </Autocomplete.InputGroup>
      </Autocomplete>
    )
    const input = container.querySelector('input')!
    expect(input).not.toHaveAttribute('aria-invalid')
    expect(input).not.toHaveAttribute('aria-required')
  })
})

function Cities(props: Partial<AutocompleteProps>) {
  return (
    <Autocomplete items={['Brisbane', 'Sydney', 'Melbourne']} {...props}>
      <Autocomplete.InputGroup>
        <Autocomplete.Input aria-label='City' />
        <Autocomplete.Trigger aria-label='Show cities' />
      </Autocomplete.InputGroup>
      <Autocomplete.Portal>
        <Autocomplete.Positioner>
          <Autocomplete.Popup>
            <Autocomplete.List>
              {(city: string) => (
                <Autocomplete.Item key={city} value={city}>
                  {city}
                </Autocomplete.Item>
              )}
            </Autocomplete.List>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete>
  )
}

const cityInput = () => screen.getByRole('combobox', { name: 'City' })

describe('Autocomplete first suggestion', () => {
  it('takes the first suggestion on Enter after typing', async () => {
    render(<Cities />)
    await userEvent.type(cityInput(), 'e')
    await screen.findByRole('option', { name: 'Sydney' })
    await userEvent.keyboard('{Enter}')
    expect(cityInput()).toHaveValue('Brisbane')
  })

  it('points the input at the highlighted suggestion for screen readers', async () => {
    render(<Cities />)
    await userEvent.type(cityInput(), 'ne')
    const first = await screen.findByRole('option', { name: 'Brisbane' })
    await waitFor(() =>
      expect(cityInput()).toHaveAttribute('aria-activedescendant', first.id)
    )
    expect(first).toHaveAttribute('data-highlighted')
  })

  it('highlights nothing when the list opens with no text', async () => {
    render(<Cities />)
    await userEvent.click(screen.getByRole('button', { name: 'Show cities' }))
    const first = await screen.findByRole('option', { name: 'Brisbane' })
    expect(first).not.toHaveAttribute('data-highlighted')
    expect(cityInput()).not.toHaveAttribute('aria-activedescendant')
  })

  it('submits an empty field on Enter while suggestions show', async () => {
    const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault())
    render(
      <form onSubmit={(event) => onSubmit(event.nativeEvent as SubmitEvent)}>
        <Cities openOnInputClick />
        <button type='submit'>Search</button>
      </form>
    )
    await userEvent.click(cityInput())
    await screen.findByRole('option', { name: 'Brisbane' })
    await userEvent.keyboard('{Enter}')
    expect(cityInput()).toHaveValue('')
    expect(onSubmit).toHaveBeenCalled()
  })

  it('drops the highlight once the text is cleared', async () => {
    render(<Cities />)
    await userEvent.type(cityInput(), 'e')
    const first = await screen.findByRole('option', { name: 'Brisbane' })
    await waitFor(() => expect(first).toHaveAttribute('data-highlighted'))
    await userEvent.keyboard('{Backspace}')
    await waitFor(() => expect(first).not.toHaveAttribute('data-highlighted'))
  })

  it('highlights suggestions that arrive after typing', async () => {
    function Late() {
      const [items, setItems] = useState<string[]>([])
      return (
        <Cities
          items={items}
          filter={null}
          onValueChange={(text) =>
            setTimeout(() => setItems(text ? ['Hobart', 'Perth'] : []))
          }
        />
      )
    }
    render(<Late />)
    await userEvent.type(cityInput(), 'h')
    const first = await screen.findByRole('option', { name: 'Hobart' })
    await waitFor(() => expect(first).toHaveAttribute('data-highlighted'))
  })

  it('follows controlled text', async () => {
    function Controlled() {
      const [value, setValue] = useState('')
      return <Cities value={value} onValueChange={setValue} />
    }
    render(<Controlled />)
    await userEvent.type(cityInput(), 'e')
    await screen.findByRole('option', { name: 'Sydney' })
    await userEvent.keyboard('{Enter}')
    expect(cityInput()).toHaveValue('Brisbane')
  })

  it('moves to the second suggestion on the first Arrow Down', async () => {
    render(<Cities />)
    await userEvent.type(cityInput(), 'e')
    await screen.findByRole('option', { name: 'Sydney' })
    await userEvent.keyboard('{ArrowDown}{Enter}')
    expect(cityInput()).toHaveValue('Sydney')
  })

  it('wraps at either end instead of returning to the input', async () => {
    render(<Cities />)
    await userEvent.type(cityInput(), 'e')
    await screen.findByRole('option', { name: 'Sydney' })
    await userEvent.keyboard('{ArrowUp}{ArrowDown}{Enter}')
    expect(cityInput()).toHaveValue('Brisbane')
  })

  it('keeps typed text that matches on Escape then Enter', async () => {
    render(<Cities />)
    await userEvent.type(cityInput(), 'e')
    await screen.findByRole('option', { name: 'Sydney' })
    await userEvent.keyboard('{Escape}{Enter}')
    expect(cityInput()).toHaveValue('e')
  })

  it('keeps the typed text when no suggestion matches', async () => {
    render(<Cities />)
    await userEvent.type(cityInput(), 'Perth{Enter}')
    expect(cityInput()).toHaveValue('Perth')
  })

  it('keeps the typed text on Enter with autoHighlight off', async () => {
    render(<Cities autoHighlight={false} />)
    await userEvent.type(cityInput(), 'e')
    await screen.findByRole('option', { name: 'Sydney' })
    await userEvent.keyboard('{Enter}')
    expect(cityInput()).toHaveValue('e')
  })

  it.each(['both', 'inline'] as const)(
    'leaves the typed text alone in %s mode',
    async (mode) => {
      render(<Cities mode={mode} />)
      await userEvent.type(cityInput(), 'Syd')
      await screen.findByRole('option', { name: 'Sydney' })
      expect(cityInput()).toHaveValue('Syd')
      expect(cityInput()).not.toHaveAttribute('aria-activedescendant')
    }
  )
})
