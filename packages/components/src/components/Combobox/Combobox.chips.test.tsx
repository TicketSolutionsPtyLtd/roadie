import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Combobox } from '.'
import { intentVariants } from '../../variants'
import { Field } from '../Field'

const genres = ['Rock', 'Jazz', 'Hip hop', 'Folk']

function Genres({
  defaultValue = ['Rock', 'Jazz'],
  onValueChange,
  disabled,
  readOnly
}: {
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
  disabled?: boolean
  readOnly?: boolean
}) {
  return (
    <Combobox
      items={genres}
      multiple
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      disabled={disabled}
      readOnly={readOnly}
    >
      <Combobox.InputGroup data-testid='group'>
        <Combobox.Value>
          {(value: string[]) => (
            <Combobox.Chips aria-label='Selected genres'>
              {value.map((genre) => (
                <Combobox.Chip key={genre} aria-label={genre}>
                  <Combobox.ChipLabel>{genre}</Combobox.ChipLabel>
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
  it('shows no remove button in a read-only combobox', () => {
    render(<Genres readOnly />)
    expect(chipNames()).toEqual(['Rock', 'Jazz'])
    expect(
      screen.queryByRole('button', { name: 'Remove Rock', hidden: true })
    ).toBeNull()
  })

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
    for (const intent of Object.values(intentVariants))
      expect(chip).not.toHaveClass(intent)
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

  it('selects the last chip with Backspace in an empty input, then removes it', async () => {
    const onValueChange = vi.fn()
    render(<Genres onValueChange={onValueChange} />)
    await userEvent.tab()
    await userEvent.keyboard('{Backspace}')
    expect(document.activeElement).toHaveAttribute('aria-label', 'Jazz')
    expect(chipNames()).toEqual(['Rock', 'Jazz'])
    expect(onValueChange).not.toHaveBeenCalled()
    await userEvent.keyboard('{Backspace}')
    expect(chipNames()).toEqual(['Rock'])
    expect(onValueChange).toHaveBeenLastCalledWith(['Rock'], expect.anything())
  })

  it('leaves Backspace to an onKeyDown that prevents the Base UI handler', async () => {
    render(
      <Combobox items={genres} multiple defaultValue={['Rock']}>
        <Combobox.Chips>
          <Combobox.Chip aria-label='Rock'>Rock</Combobox.Chip>
          <Combobox.Input
            aria-label='Genres'
            onKeyDown={(event) => event.preventBaseUIHandler()}
          />
        </Combobox.Chips>
      </Combobox>
    )
    await userEvent.tab()
    await userEvent.keyboard('{Backspace}')
    expect(document.activeElement).toBe(
      screen.getByRole('combobox', { name: 'Genres' })
    )
    expect(chipNames()).toEqual(['Rock'])
  })

  it('returns to the input on Escape from a chip, keeping every value', async () => {
    const onValueChange = vi.fn()
    render(<Genres onValueChange={onValueChange} />)
    await userEvent.tab()
    await userEvent.keyboard('{Backspace}')
    expect(document.activeElement).toHaveAttribute('aria-label', 'Jazz')
    await userEvent.keyboard('{Escape}')
    expect(document.activeElement).toBe(
      screen.getByRole('combobox', { name: 'Genres' })
    )
    expect(chipNames()).toEqual(['Rock', 'Jazz'])
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('arrows from the last chip again after Escape from a chip', async () => {
    render(<Genres defaultValue={['Rock', 'Jazz', 'Folk']} />)
    await userEvent.tab()
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}{Escape}{ArrowLeft}')
    expect(document.activeElement).toHaveAttribute('aria-label', 'Folk')
  })

  it('keeps Right Arrow and Delete in the input after Escape from a chip', async () => {
    const onValueChange = vi.fn()
    render(
      <Genres
        defaultValue={['Rock', 'Jazz', 'Folk']}
        onValueChange={onValueChange}
      />
    )
    const input = screen.getByRole('combobox', { name: 'Genres' })
    await userEvent.tab()
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}{Escape}{ArrowRight}')
    expect(document.activeElement).toBe(input)
    await userEvent.keyboard('{Delete}')
    expect(document.activeElement).toBe(input)
    await userEvent.keyboard('{Backspace}')
    expect(document.activeElement).toHaveAttribute('aria-label', 'Folk')
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('leaves a modified Backspace or Left Arrow to the input', async () => {
    render(<Genres />)
    const input = screen.getByRole('combobox', { name: 'Genres' })
    await userEvent.tab()
    await userEvent.keyboard('{Alt>}{Backspace}{ArrowLeft}{/Alt}')
    expect(document.activeElement).toBe(input)
    expect(chipNames()).toEqual(['Rock', 'Jazz'])
  })

  it('collapses selected text on Left Arrow before moving to the chips', async () => {
    render(<Genres />)
    const input = screen.getByRole<HTMLInputElement>('combobox', {
      name: 'Genres'
    })
    await userEvent.type(input, 'abc')
    input.setSelectionRange(0, 3)
    await userEvent.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(input)
  })

  it('keeps focus in a read-only input on Backspace', async () => {
    render(
      <Combobox items={genres} multiple defaultValue={['Rock']} readOnly>
        <Combobox.Chips>
          <Combobox.Chip aria-label='Rock'>Rock</Combobox.Chip>
          <Combobox.Input aria-label='Genres' />
        </Combobox.Chips>
      </Combobox>
    )
    const input = screen.getByRole('combobox', { name: 'Genres' })
    await userEvent.click(input)
    await userEvent.keyboard('{Backspace}')
    expect(document.activeElement).toBe(input)
  })

  it('leaves Escape to a chip onKeyDown that prevents the Base UI handler', async () => {
    render(
      <Combobox items={genres} multiple defaultValue={['Rock']}>
        <Combobox.Chips>
          <Combobox.Chip
            aria-label='Rock'
            onKeyDown={(event) => event.preventBaseUIHandler()}
          >
            Rock
          </Combobox.Chip>
          <Combobox.Input aria-label='Genres' />
        </Combobox.Chips>
      </Combobox>
    )
    await userEvent.tab()
    await userEvent.keyboard('{Backspace}{Escape}')
    expect(document.activeElement).toHaveAttribute('aria-label', 'Rock')
  })

  it('leaves a disabled chip unfocused when it is clicked', async () => {
    render(<Genres disabled />)
    await userEvent.click(screen.getByText('Rock'))
    expect(document.activeElement).toBe(document.body)
  })

  it('selects a chip when it is clicked', async () => {
    render(<Genres />)
    await userEvent.click(screen.getByText('Rock'))
    expect(document.activeElement).toHaveAttribute('aria-label', 'Rock')
  })

  it('moves to the chips with the left arrow and removes the focused one', async () => {
    render(<Genres />)
    await userEvent.tab()
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(document.activeElement).toHaveAttribute('aria-label', 'Rock')
    await userEvent.keyboard('{Delete}')
    expect(chipNames()).toEqual(['Jazz'])
  })

  it('returns focus to the input after the remove button is pressed', async () => {
    render(<Genres />)
    await userEvent.click(screen.getByRole('button', { name: 'Remove Jazz' }))
    expect(document.activeElement).toBe(
      screen.getByRole('combobox', { name: 'Genres' })
    )
  })

  it('keeps every chip with Escape while the popup is closed', async () => {
    const onValueChange = vi.fn()
    render(<Genres onValueChange={onValueChange} />)
    await userEvent.tab()
    await userEvent.keyboard('{Escape}')
    expect(chipNames()).toEqual(['Rock', 'Jazz'])
    expect(onValueChange).not.toHaveBeenCalled()
  })

  // Such as a dialog's, which would otherwise never close from the input.
  it('lets an Escape with nothing to clear reach the page', async () => {
    const onPageKeyDown = vi.fn()
    render(
      <div onKeyDown={(event) => onPageKeyDown(event.key)}>
        <Genres />
      </div>
    )
    await userEvent.tab()
    await userEvent.keyboard('{Escape}')
    expect(onPageKeyDown).toHaveBeenCalledWith('Escape')
  })

  it('keeps every chip while disabled', async () => {
    render(<Genres disabled />)
    await userEvent.click(screen.getByRole('button', { name: 'Remove Rock' }))
    expect(chipNames()).toEqual(['Rock', 'Jazz'])
  })

  it('takes custom remove button content in place of the icon', () => {
    render(
      <Combobox items={genres} multiple defaultValue={['Rock']}>
        <Combobox.Chips>
          <Combobox.Chip>
            Rock
            <Combobox.ChipRemove aria-label='Remove Rock'>
              ×
            </Combobox.ChipRemove>
          </Combobox.Chip>
        </Combobox.Chips>
      </Combobox>
    )
    const remove = screen.getByRole('button', { name: 'Remove Rock' })
    expect(remove).toHaveTextContent('×')
    expect(remove.querySelector('svg')).not.toBeInTheDocument()
  })

  it('truncates a chip label', () => {
    render(<Genres />)
    expect(screen.getByText('Rock')).toHaveAttribute(
      'data-slot',
      'combobox-chip-label'
    )
    expect(screen.getByText('Rock')).toHaveClass('truncate')
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
})
