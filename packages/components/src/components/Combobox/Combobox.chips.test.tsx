import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Combobox } from '.'
import { Field } from '../Field'

const genres = ['Rock', 'Jazz', 'Hip hop', 'Folk']

function Genres({
  defaultValue = ['Rock', 'Jazz'],
  onValueChange
}: {
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
}) {
  return (
    <Combobox
      items={genres}
      multiple
      defaultValue={defaultValue}
      onValueChange={onValueChange}
    >
      <Combobox.InputGroup data-testid='group'>
        <Combobox.Value>
          {(value: string[]) => (
            <Combobox.Chips aria-label='Selected genres'>
              {value.map((genre) => (
                <Combobox.Chip key={genre} aria-label={genre}>
                  {genre}
                  <Combobox.ChipRemove aria-label={`Remove ${genre}`} />
                </Combobox.Chip>
              ))}
              <Combobox.Input aria-label='Genres' />
            </Combobox.Chips>
          )}
        </Combobox.Value>
      </Combobox.InputGroup>
    </Combobox>
  )
}

const chipNames = () =>
  [...document.querySelectorAll('[data-slot=combobox-chip]')].map((chip) =>
    chip.getAttribute('aria-label')
  )

describe('Combobox chips', () => {
  it('renders a chip per selected value, before the input', () => {
    render(<Genres />)
    const chips = screen.getByRole('toolbar', { name: 'Selected genres' })
    expect(chips).toHaveAttribute('data-slot', 'combobox-chips')
    expect(chipNames()).toEqual(['Rock', 'Jazz'])
    expect(chips.lastElementChild).toBe(
      screen.getByRole('combobox', { name: 'Genres' })
    )
  })

  it('styles a chip as a subtle pill that inherits the intent', () => {
    render(<Genres />)
    const chip = screen.getByText('Rock').closest('[data-slot=combobox-chip]')!
    expect(chip).toHaveClass(
      'emphasis-subtle',
      'rounded-full',
      'is-interactive'
    )
    expect(chip.className).not.toMatch(/intent-/)
  })

  it('gives the remove button a default icon and an accessible name', () => {
    render(<Genres />)
    const remove = screen.getByRole('button', { name: 'Remove Rock' })
    expect(remove).toHaveAttribute('data-slot', 'combobox-chip-remove')
    expect(remove.querySelector('svg')).toBeInTheDocument()
    expect(remove).toHaveClass('emphasis-subtler', 'rounded-full')
  })

  it('removes a value with its remove button', async () => {
    const onValueChange = vi.fn()
    render(<Genres onValueChange={onValueChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Remove Rock' }))
    expect(chipNames()).toEqual(['Jazz'])
    expect(onValueChange).toHaveBeenLastCalledWith(['Jazz'], expect.anything())
  })

  it('removes the last chip with Backspace in an empty input', async () => {
    render(<Genres />)
    await userEvent.click(screen.getByRole('combobox', { name: 'Genres' }))
    await userEvent.keyboard('{Escape}{Backspace}')
    expect(chipNames()).toEqual(['Rock'])
  })

  it('moves to the chips with the left arrow and removes the focused one', async () => {
    render(<Genres />)
    await userEvent.click(screen.getByRole('combobox', { name: 'Genres' }))
    await userEvent.keyboard('{Escape}{ArrowLeft}{ArrowLeft}')
    expect(document.activeElement).toHaveAttribute('aria-label', 'Rock')
    await userEvent.keyboard('{Backspace}')
    expect(chipNames()).toEqual(['Jazz'])
  })

  it('keeps the field wiring on the input inside the chips', () => {
    render(
      <Field invalid>
        <Field.Label>Genres</Field.Label>
        <Combobox items={genres} multiple defaultValue={['Rock']}>
          <Combobox.InputGroup data-testid='group'>
            <Combobox.Chips>
              <Combobox.Input />
            </Combobox.Chips>
          </Combobox.InputGroup>
        </Combobox>
      </Field>
    )
    expect(screen.getByRole('combobox', { name: 'Genres' })).toHaveAttribute(
      'aria-invalid',
      'true'
    )
    expect(screen.getByTestId('group')).toHaveAttribute('aria-invalid', 'true')
  })

  it('lets the input group grow past its size when chips wrap', () => {
    render(<Genres />)
    const group = screen.getByTestId('group')
    expect(group).toHaveClass('min-h-10')
    expect(group).not.toHaveClass('h-10')
  })
})
