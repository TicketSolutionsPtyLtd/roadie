import { useState } from 'react'

import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { QueryField, type QueryFieldProps } from '.'
import { Field } from '../Field'
import type {
  QueryFieldChip,
  QueryFieldSuggestion,
  QueryFieldSuggestionGroup
} from './types'

const venueField: QueryFieldSuggestion = {
  id: 'field:venue',
  label: 'Venue',
  kind: 'field',
  value: 'venue'
}
const longacre: QueryFieldSuggestion = {
  id: 'venue:longacre',
  label: 'Venue is The Longacre',
  kind: 'filter',
  value: 'longacre'
}
const order: QueryFieldSuggestion = {
  id: 'order:1042',
  label: 'Order 1042',
  description: 'Neon Nights, 2 tickets',
  kind: 'record',
  value: 1042,
  exact: true
}

function suggestFor(text: string): QueryFieldSuggestionGroup[] {
  if (text === '1042')
    return [{ id: 'records', label: 'Orders', items: [order] }]
  if (text)
    return [
      { id: 'filters', label: 'Filters', items: [longacre] },
      { id: 'fields', label: 'Fields', items: [venueField] }
    ]
  return [{ id: 'fields', label: 'Filter by', items: [venueField] }]
}

const scope: QueryFieldChip = {
  id: 'event',
  label: 'Event is Neon Nights',
  locked: true
}
const status: QueryFieldChip = { id: 'status', label: 'Status is On sale' }
const city: QueryFieldChip = { id: 'city', label: 'City is Perth' }

type HarnessProps = Partial<QueryFieldProps> & {
  initialChips?: QueryFieldChip[]
}

function Harness({ initialChips = [], ...props }: HarnessProps) {
  const [chips, setChips] = useState(initialChips)
  return (
    <QueryField
      aria-label='Search orders'
      chips={chips}
      onRemoveChip={(id) =>
        setChips((current) => current.filter((chip) => chip.id !== id))
      }
      suggest={suggestFor}
      {...props}
    />
  )
}

const input = () => screen.getByRole('combobox', { name: 'Search orders' })
const chipNames = () =>
  [...document.querySelectorAll('[data-slot=combobox-chip]')].map((chip) =>
    chip.getAttribute('aria-label')
  )
const optionNames = () =>
  screen
    .queryAllByRole('option')
    .map(
      (option) =>
        option.querySelector('[data-slot=query-field-option-label]')
          ?.textContent
    )

async function typeInto(text: string) {
  await userEvent.click(input())
  await userEvent.keyboard(text)
}

describe('QueryField', () => {
  it('is a search field named by aria-label, with default copy', () => {
    render(<Harness />)
    expect(input()).toHaveAttribute('placeholder', 'Search and filter')
    expect(
      document.querySelector('[data-slot=query-field] svg')
    ).toBeInTheDocument()
  })

  it('takes its label, invalid, disabled and required from Field', () => {
    render(
      <Field invalid disabled required>
        <Field.Label>Find orders</Field.Label>
        <QueryField suggest={suggestFor} />
      </Field>
    )
    const field = screen.getByRole('combobox', { name: 'Find orders' })
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(field).toHaveAttribute('aria-required', 'true')
    expect(field).toBeDisabled()
    expect(document.querySelector('[data-slot=query-field]')).toHaveAttribute(
      'aria-invalid',
      'true'
    )
  })

  it('marks itself invalid on its own', () => {
    render(<Harness invalid />)
    expect(input()).toHaveAttribute('aria-invalid', 'true')
  })

  it('puts locked chips first, with no remove button', () => {
    render(<Harness initialChips={[status, scope, city]} />)
    expect(chipNames()).toEqual([
      'Event is Neon Nights',
      'Status is On sale',
      'City is Perth'
    ])
    expect(
      screen.queryByRole('button', { name: 'Remove Event is Neon Nights' })
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Remove City is Perth' })
    ).toBeInTheDocument()
  })

  it('drops the placeholder once there are chips', () => {
    render(<Harness initialChips={[status]} />)
    expect(input()).toHaveAttribute('placeholder', '')
  })

  it('lists suggestions in the order given, then free-text search', async () => {
    render(<Harness />)
    await typeInto('long')
    await waitFor(() =>
      expect(optionNames()).toEqual([
        'Venue is The Longacre',
        'Venue',
        'Search for “long”'
      ])
    )
  })

  it('lists recent items above the fields on an empty field', async () => {
    render(<Harness recent={[longacre]} />)
    await userEvent.click(input())
    await waitFor(() =>
      expect(optionNames()).toEqual(['Venue is The Longacre', 'Venue'])
    )
    expect(screen.getByText('Recent')).toBeInTheDocument()
  })

  it('searches the free text on Enter, never taking a filter it was not moved to', async () => {
    const onAccept = vi.fn()
    render(<Harness onAccept={onAccept} />)
    await typeInto('long')
    await waitFor(() => expect(optionNames()).toHaveLength(3))
    await userEvent.keyboard('{Enter}')
    expect(onAccept).toHaveBeenCalledWith({
      id: 'search',
      kind: 'search',
      label: 'Search for “long”',
      value: 'long'
    })
    expect(input()).toHaveValue('long')
  })

  it('takes an exact identifier on Enter', async () => {
    const onAccept = vi.fn()
    render(<Harness onAccept={onAccept} />)
    await typeInto('1042')
    await waitFor(() => expect(optionNames()).toContain('Order 1042'))
    await userEvent.keyboard('{Enter}')
    expect(onAccept).toHaveBeenCalledWith(order)
  })

  it('takes a filter moved to with the arrows, and clears the text', async () => {
    const onAccept = vi.fn()
    render(<Harness onAccept={onAccept} />)
    await typeInto('long')
    await waitFor(() => expect(optionNames()).toHaveLength(3))
    await userEvent.keyboard('{ArrowDown}{Enter}')
    expect(onAccept).toHaveBeenCalledWith(longacre)
    expect(input()).toHaveValue('')
  })

  it('takes a clicked suggestion', async () => {
    const onAccept = vi.fn()
    render(<Harness onAccept={onAccept} />)
    await typeInto('long')
    await userEvent.click(
      await screen.findByRole('option', { name: /Venue is The Longacre/ })
    )
    expect(onAccept).toHaveBeenCalledWith(longacre)
    expect(chipNames()).toEqual([])
  })

  it('shows the Enter hint on the suggestion Enter would take', async () => {
    render(<Harness />)
    await typeInto('long')
    await waitFor(() => expect(optionNames()).toHaveLength(3))
    const hinted = () =>
      screen
        .getAllByRole('option')
        .filter((option) => option.querySelector('kbd'))
        .map(
          (option) =>
            option.querySelector('[data-slot=query-field-option-label]')
              ?.textContent
        )
    expect(hinted()).toEqual(['Search for “long”'])
    await userEvent.keyboard('{ArrowDown}')
    await waitFor(() => expect(hinted()).toEqual(['Venue is The Longacre']))
  })

  it('keeps the list open on a field, for the value step', async () => {
    const onAccept = vi.fn()
    render(<Harness onAccept={onAccept} />)
    await userEvent.click(input())
    await userEvent.click(await screen.findByRole('option', { name: /Venue/ }))
    expect(onAccept).toHaveBeenCalledWith(venueField)
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('asks for suggestions again when the pending chip changes', async () => {
    const suggest = vi.fn(suggestFor)
    const { rerender } = render(<Harness suggest={suggest} />)
    await userEvent.click(input())
    await waitFor(() => expect(suggest).toHaveBeenCalledTimes(1))
    rerender(
      <Harness
        suggest={suggest}
        pendingChip={{ id: 'venue', label: 'Venue is' }}
      />
    )
    await waitFor(() => expect(suggest).toHaveBeenCalledTimes(2))
    expect(
      document.querySelector('[data-slot=query-field-pending-chip]')
    ).toHaveTextContent('Venue is')
  })

  it('goes back from the value step with Backspace or Escape', async () => {
    const onPendingChipCancel = vi.fn()
    render(
      <Harness
        initialChips={[status]}
        pendingChip={{ id: 'venue', label: 'Venue is' }}
        onPendingChipCancel={onPendingChipCancel}
      />
    )
    await userEvent.click(input())
    await userEvent.keyboard('{Backspace}')
    await userEvent.keyboard('{Escape}')
    expect(onPendingChipCancel).toHaveBeenCalledTimes(2)
    expect(chipNames()).toEqual(['Status is On sale'])
  })

  it('selects, then removes, the last chip with Backspace on an empty field', async () => {
    render(<Harness initialChips={[scope, status, city]} />)
    await userEvent.tab()
    await userEvent.keyboard('{Backspace}')
    expect(chipNames()).toHaveLength(3)
    expect(document.activeElement).toHaveAttribute(
      'aria-label',
      'City is Perth'
    )
    await userEvent.keyboard('{Backspace}')
    expect(chipNames()).toEqual(['Event is Neon Nights', 'Status is On sale'])
    expect(document.activeElement).toBe(input())
  })

  it('never removes a locked chip from the keyboard', async () => {
    render(<Harness initialChips={[scope]} />)
    await userEvent.tab()
    await userEvent.keyboard('{Backspace}{Backspace}')
    expect(chipNames()).toEqual(['Event is Neon Nights'])
    await userEvent.keyboard('{ArrowLeft}')
    expect(document.activeElement).toHaveAttribute(
      'aria-label',
      'Event is Neon Nights'
    )
    await userEvent.keyboard('{Delete}{Backspace}')
    expect(chipNames()).toEqual(['Event is Neon Nights'])
  })

  it('keeps every chip on Escape with the list closed', async () => {
    render(<Harness initialChips={[scope, status]} />)
    await userEvent.tab()
    await userEvent.keyboard('{Escape}')
    expect(chipNames()).toHaveLength(2)
  })

  it('removes a chip with its remove button', async () => {
    render(<Harness initialChips={[scope, status]} />)
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove Status is On sale' })
    )
    expect(chipNames()).toEqual(['Event is Neon Nights'])
  })

  it('opens a chip editor on click, Enter or Space', async () => {
    const onEditChip = vi.fn()
    render(<Harness initialChips={[scope, status]} onEditChip={onEditChip} />)
    const chip = screen.getByRole('button', { name: 'Status is On sale' })
    await userEvent.click(chip)
    expect(onEditChip).toHaveBeenLastCalledWith('status', chip)
    chip.focus()
    await userEvent.keyboard('{Enter}')
    await userEvent.keyboard(' ')
    expect(onEditChip).toHaveBeenCalledTimes(3)
    expect(
      screen.queryByRole('button', { name: 'Event is Neon Nights' })
    ).not.toBeInTheDocument()
  })

  it('clears text and unlocked chips, never locked ones', async () => {
    const onInputValueChange = vi.fn()
    render(
      <Harness
        initialChips={[scope, status, city]}
        defaultInputValue='neon'
        onInputValueChange={onInputValueChange}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(chipNames()).toEqual(['Event is Neon Nights'])
    expect(input()).toHaveValue('')
    expect(onInputValueChange).toHaveBeenLastCalledWith('')
    expect(
      screen.queryByRole('button', { name: 'Clear' })
    ).not.toBeInTheDocument()
  })

  it('hands Clear to onClear when given', async () => {
    const onClear = vi.fn()
    const onRemoveChip = vi.fn()
    render(
      <QueryField
        aria-label='Search orders'
        chips={[scope, status]}
        suggest={suggestFor}
        onClear={onClear}
        onRemoveChip={onRemoveChip}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(onClear).toHaveBeenCalledOnce()
    expect(onRemoveChip).not.toHaveBeenCalled()
  })

  it('focuses on its shortcut, unless another field has focus', async () => {
    render(
      <>
        <input aria-label='Other' />
        <Harness shortcut='/' />
      </>
    )
    expect(input()).toHaveAttribute('aria-keyshortcuts', '/')
    await userEvent.keyboard('/')
    expect(document.activeElement).toBe(input())
    expect(input()).toHaveValue('')
    await userEvent.click(screen.getByRole('textbox', { name: 'Other' }))
    await userEvent.keyboard('/')
    expect(screen.getByRole('textbox', { name: 'Other' })).toHaveValue('/')
  })

  it('shows the shortcut hint only while empty', async () => {
    render(<Harness shortcut='/' />)
    expect(
      document.querySelector('[data-slot=query-field-shortcut]')
    ).toHaveTextContent('/')
    await typeInto('n')
    expect(
      document.querySelector('[data-slot=query-field-shortcut]')
    ).not.toBeInTheDocument()
  })

  it('ignores suggestions that arrive after newer ones', async () => {
    const slow = Promise.withResolvers<QueryFieldSuggestionGroup[]>()
    const suggest = vi.fn((text: string) =>
      text === 'l' ? slow.promise : suggestFor(text)
    )
    render(<Harness suggest={suggest} />)
    await typeInto('lo')
    await waitFor(() => expect(optionNames()).toHaveLength(3))
    await act(async () =>
      slow.resolve([{ id: 'stale', label: 'Stale', items: [order] }])
    )
    expect(optionNames()).not.toContain('Order 1042')
  })
})
