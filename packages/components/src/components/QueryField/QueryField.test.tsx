import { createRef, useState } from 'react'

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
  [...document.querySelectorAll('[data-slot=combobox-chip]')].map(
    (chip) => chip.querySelector('[data-slot=combobox-chip-label]')?.textContent
  )
const chipElement = (id: string) =>
  document.querySelector<HTMLElement>(
    `[data-slot=combobox-chip][data-chip-id="${id}"]`
  )
const hinted = () =>
  screen
    .queryAllByRole('option')
    .filter((option) => option.querySelector('kbd'))
    .map(
      (option) =>
        option.querySelector('[data-slot=query-field-option-label]')
          ?.textContent
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
    expect(document.activeElement).toBe(chipElement('city'))
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
    expect(document.activeElement).toBe(chipElement('event'))
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

  it('opens a chip editor on click, Enter or Space, anchored to the chip', async () => {
    const onEditChip = vi.fn()
    render(<Harness initialChips={[scope, status]} onEditChip={onEditChip} />)
    const chip = chipElement('status')!
    await userEvent.click(
      screen.getByRole('button', { name: 'Status is On sale' })
    )
    expect(onEditChip).toHaveBeenLastCalledWith('status', chip)
    chip.focus()
    await userEvent.keyboard('{Enter}')
    await userEvent.keyboard(' ')
    expect(onEditChip).toHaveBeenCalledTimes(3)
    expect(
      screen.queryByRole('button', { name: /Event is Neon Nights/ })
    ).not.toBeInTheDocument()
  })

  it('keeps the remove button outside the edit button', () => {
    render(<Harness initialChips={[status]} onEditChip={() => {}} />)
    const edit = screen.getByRole('button', { name: 'Status is On sale' })
    const remove = screen.getByRole('button', {
      name: 'Remove Status is On sale'
    })
    expect(edit.contains(remove)).toBe(false)
    expect(chipElement('status')).not.toHaveAttribute('role')
    expect(chipElement('status')).not.toHaveAttribute('aria-label')
  })

  it('tells screen readers a locked chip is set by the page', () => {
    render(<Harness initialChips={[scope]} />)
    expect(chipElement('event')).toHaveTextContent(
      'Event is Neon Nights, set by this page'
    )
  })

  it('describes the input with the pending chip, alongside Field help', () => {
    render(
      <Field>
        <Field.Label>Find orders</Field.Label>
        <QueryField
          suggest={suggestFor}
          pendingChip={{ id: 'venue', label: 'Venue is' }}
        />
        <Field.HelperText>Search by name</Field.HelperText>
      </Field>
    )
    expect(
      screen.getByRole('combobox', { name: 'Find orders' })
    ).toHaveAccessibleDescription('Search by name Venue is')
  })

  it('does nothing to chips or text while disabled', async () => {
    const onEditChip = vi.fn()
    render(
      <Harness
        disabled
        shortcut='/'
        defaultInputValue='neon'
        initialChips={[status]}
        onEditChip={onEditChip}
      />
    )
    expect(
      screen.queryByRole('button', { name: 'Clear' })
    ).not.toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: 'Status is On sale' })
    )
    chipElement('status')!.focus()
    await userEvent.keyboard('{Enter}{Backspace}')
    expect(onEditChip).not.toHaveBeenCalled()
    expect(chipNames()).toEqual(['Status is On sale'])
    document.body.focus()
    const slash = new KeyboardEvent('keydown', { key: '/', cancelable: true })
    document.dispatchEvent(slash)
    expect(slash.defaultPrevented).toBe(false)
  })

  it('searches the free text after arrowing to the search row', async () => {
    const onAccept = vi.fn()
    render(<Harness onAccept={onAccept} />)
    await typeInto('long')
    await waitFor(() => expect(optionNames()).toHaveLength(3))
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{Enter}')
    expect(onAccept).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'search', value: 'long' })
    )
  })

  it('never lets Enter take a suggestion the pointer rests on', async () => {
    const onAccept = vi.fn()
    render(<Harness onAccept={onAccept} />)
    await typeInto('long')
    await userEvent.hover(
      await screen.findByRole('option', { name: /Venue is The Longacre/ })
    )
    await userEvent.keyboard('{Enter}')
    expect(onAccept).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'search' })
    )
  })

  it('never lets Enter take a value under the pointer after a click', async () => {
    const onAccept = vi.fn()
    function ValueStep() {
      const [pending, setPending] = useState(false)
      return (
        <Harness
          pendingChip={pending ? { id: 'venue', label: 'Venue is' } : undefined}
          suggest={(text) =>
            pending
              ? [{ id: 'values', label: 'Venue is', items: [longacre, order] }]
              : suggestFor(text)
          }
          onAccept={(suggestion) => {
            onAccept(suggestion)
            if (suggestion.kind === 'field') setPending(true)
          }}
        />
      )
    }
    render(<ValueStep />)
    await userEvent.click(input())
    await userEvent.click(await screen.findByRole('option', { name: /Venue/ }))
    await waitFor(() => expect(optionNames()).toContain('Order 1042'))
    await userEvent.keyboard('{Enter}')
    expect(onAccept).toHaveBeenLastCalledWith(order)
  })

  it('ignores an exact match found for older text', async () => {
    const onAccept = vi.fn()
    const later = Promise.withResolvers<QueryFieldSuggestionGroup[]>()
    render(
      <Harness
        onAccept={onAccept}
        suggest={(text) =>
          text === '1042x' ? later.promise : suggestFor(text)
        }
      />
    )
    await typeInto('1042')
    await waitFor(() => expect(optionNames()).toContain('Order 1042'))
    await userEvent.keyboard('x{Enter}')
    expect(onAccept).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'search', value: '1042x' })
    )
  })

  it('leaves Enter alone while composing or with a modifier', async () => {
    const onAccept = vi.fn()
    render(<Harness onAccept={onAccept} />)
    await typeInto('long')
    await waitFor(() => expect(optionNames()).toHaveLength(3))
    await userEvent.keyboard('{ArrowDown}')
    fireEvent.keyDown(input(), { key: 'Enter', isComposing: true })
    fireEvent.keyDown(input(), { key: 'Enter', keyCode: 229 })
    expect(onAccept).not.toHaveBeenCalled()
    const modified = fireEvent.keyDown(input(), { key: 'Enter', metaKey: true })
    expect(onAccept).not.toHaveBeenCalled()
    expect(modified).toBe(false)
  })

  it('takes the first suggestion after opening with ArrowDown', async () => {
    const onAccept = vi.fn()
    render(<Harness onAccept={onAccept} />)
    await userEvent.tab()
    await userEvent.keyboard('{ArrowDown}')
    await waitFor(() => expect(optionNames()).toEqual(['Venue']))
    await userEvent.keyboard('{Enter}')
    expect(onAccept).toHaveBeenLastCalledWith(venueField)
  })

  it('takes an arrowed suggestion after an earlier pointer highlight', async () => {
    const onAccept = vi.fn()
    render(<Harness onAccept={onAccept} />)
    await userEvent.click(input())
    await userEvent.hover(await screen.findByRole('option', { name: /Venue/ }))
    await userEvent.keyboard('{Escape}')
    await userEvent.keyboard('{ArrowDown}')
    await waitFor(() => expect(optionNames()).toEqual(['Venue']))
    await userEvent.keyboard('{Enter}')
    expect(onAccept).toHaveBeenLastCalledWith(venueField)
  })

  it('keeps a hovered filter out of Enter when the caret moves', async () => {
    const onAccept = vi.fn()
    render(<Harness onAccept={onAccept} />)
    await typeInto('long')
    await userEvent.hover(
      await screen.findByRole('option', { name: /Venue is The Longacre/ })
    )
    await userEvent.keyboard('{End}')
    expect(hinted()).toEqual(['Search for “long”'])
    await userEvent.keyboard('{Enter}')
    expect(onAccept).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'search' })
    )
  })

  it('hands Enter back to the search once the pointer takes over', async () => {
    const onAccept = vi.fn()
    render(<Harness onAccept={onAccept} />)
    await typeInto('long')
    await waitFor(() => expect(optionNames()).toHaveLength(3))
    await userEvent.keyboard('{ArrowDown}')
    await userEvent.hover(screen.getByRole('option', { name: /^Venue$/ }))
    expect(hinted()).toEqual(['Search for “long”'])
    await userEvent.keyboard('{Enter}')
    expect(onAccept).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'search' })
    )
  })

  it('starts the value step with no value as Enter target', async () => {
    const onAccept = vi.fn()
    function ValueStep() {
      const [pending, setPending] = useState(false)
      return (
        <Harness
          pendingChip={pending ? { id: 'venue', label: 'Venue is' } : undefined}
          suggest={(text) =>
            pending
              ? [{ id: 'values', label: 'Venue is', items: [longacre] }]
              : suggestFor(text)
          }
          onAccept={(suggestion) => {
            onAccept(suggestion)
            if (suggestion.kind === 'field') setPending(true)
          }}
        />
      )
    }
    render(<ValueStep />)
    await userEvent.tab()
    await userEvent.keyboard('{ArrowDown}')
    await waitFor(() => expect(optionNames()).toEqual(['Venue']))
    await userEvent.keyboard('{Enter}')
    await waitFor(() =>
      expect(optionNames()).toEqual(['Venue is The Longacre'])
    )
    expect(hinted()).toEqual([])
    await userEvent.keyboard('{Enter}')
    expect(onAccept).toHaveBeenCalledTimes(1)
  })

  it('drops the arrowed value when the value step is cancelled', async () => {
    const onAccept = vi.fn()
    function ValueStep() {
      const [pending, setPending] = useState(true)
      return (
        <Harness
          pendingChip={pending ? { id: 'venue', label: 'Venue is' } : undefined}
          onPendingChipCancel={() => setPending(false)}
          suggest={(text) =>
            pending
              ? [{ id: 'values', label: 'Venue is', items: [longacre] }]
              : suggestFor(text)
          }
          onAccept={onAccept}
        />
      )
    }
    render(<ValueStep />)
    await userEvent.tab()
    await userEvent.keyboard('{ArrowDown}')
    await waitFor(() =>
      expect(optionNames()).toEqual(['Venue is The Longacre'])
    )
    await userEvent.keyboard('{Backspace}')
    await waitFor(() => expect(optionNames()).toEqual(['Venue']))
    expect(hinted()).toEqual([])
    await userEvent.keyboard('{Enter}')
    expect(onAccept).not.toHaveBeenCalled()
  })

  it('keeps an arrowed field out of Enter after the value step is cancelled', async () => {
    const onAccept = vi.fn()
    function ValueStep() {
      const [pending, setPending] = useState(false)
      return (
        <Harness
          pendingChip={pending ? { id: 'venue', label: 'Venue is' } : undefined}
          onPendingChipCancel={() => setPending(false)}
          suggest={(text) =>
            pending
              ? [{ id: 'values', label: 'Venue is', items: [longacre] }]
              : suggestFor(text)
          }
          onAccept={(suggestion) => {
            onAccept(suggestion)
            if (suggestion.kind === 'field') setPending(true)
          }}
        />
      )
    }
    render(<ValueStep />)
    await userEvent.tab()
    await userEvent.keyboard('{ArrowDown}')
    await waitFor(() => expect(optionNames()).toEqual(['Venue']))
    await userEvent.keyboard('{Enter}')
    await waitFor(() =>
      expect(optionNames()).toEqual(['Venue is The Longacre'])
    )
    await userEvent.keyboard('{Backspace}')
    await waitFor(() => expect(optionNames()).toEqual(['Venue']))
    expect(hinted()).toEqual([])
    await userEvent.keyboard('{Enter}')
    expect(onAccept).toHaveBeenCalledTimes(1)
  })

  it('hands Enter back to the search when End moves the caret', async () => {
    const onAccept = vi.fn()
    render(<Harness onAccept={onAccept} />)
    await typeInto('long')
    await waitFor(() => expect(optionNames()).toHaveLength(3))
    await userEvent.keyboard('{ArrowDown}')
    await waitFor(() => expect(hinted()).toEqual(['Venue is The Longacre']))
    await userEvent.keyboard('{End}')
    expect(hinted()).toEqual(['Search for “long”'])
    await userEvent.keyboard('{Enter}')
    expect(onAccept).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'search' })
    )
  })

  it('keeps its own rows apart from suggestions that reuse their ids', async () => {
    const clash: QueryFieldSuggestion = {
      id: 'search',
      label: 'Search venues',
      kind: 'field',
      value: 'venue'
    }
    const onAccept = vi.fn()
    render(
      <Harness
        onAccept={onAccept}
        suggest={() => [{ id: 'search', label: 'Fields', items: [clash] }]}
      />
    )
    await typeInto('long')
    await waitFor(() =>
      expect(optionNames()).toEqual(['Search venues', 'Search for “long”'])
    )
    expect(hinted()).toEqual(['Search for “long”'])
    await userEvent.keyboard('{Enter}')
    expect(onAccept).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'search', value: 'long' })
    )
  })

  it("shows no earlier step's suggestions while the value step loads", async () => {
    const values = Promise.withResolvers<QueryFieldSuggestionGroup[]>()
    const { rerender } = render(<Harness />)
    await userEvent.click(input())
    await waitFor(() => expect(optionNames()).toEqual(['Venue']))
    rerender(
      <Harness
        pendingChip={{ id: 'venue', label: 'Venue is' }}
        suggest={() => values.promise}
      />
    )
    await waitFor(() => expect(optionNames()).toEqual([]))
    expect(screen.getByText('Loading suggestions')).toBeInTheDocument()
    expect(screen.queryByText('No suggestions')).not.toBeInTheDocument()
    await act(async () =>
      values.resolve([{ id: 'values', label: 'Venue is', items: [longacre] }])
    )
    expect(optionNames()).toEqual(['Venue is The Longacre'])
  })

  it('tells assistive technology Enter edits a chip', () => {
    render(<Harness initialChips={[scope, status]} onEditChip={() => {}} />)
    expect(chipElement('status')).toHaveAttribute('aria-keyshortcuts', 'Enter')
    expect(chipElement('event')).not.toHaveAttribute('aria-keyshortcuts')
  })

  it('keeps recent items out of the value step', async () => {
    render(
      <Harness
        recent={[longacre]}
        pendingChip={{ id: 'venue', label: 'Venue is' }}
      />
    )
    await userEvent.click(input())
    await waitFor(() => expect(optionNames()).toEqual(['Venue']))
  })

  it('hands its input to inputRef', () => {
    const inputRef = createRef<HTMLInputElement>()
    render(<Harness inputRef={inputRef} />)
    expect(inputRef.current).toBe(input())
  })

  it('leaves form validity to the app', () => {
    render(<Harness required />)
    expect(input()).toHaveAttribute('aria-required', 'true')
    expect(document.querySelector('input[required]')).toBeNull()
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
