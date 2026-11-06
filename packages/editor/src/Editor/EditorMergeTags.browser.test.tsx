import {
  cleanup,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'
import { userEvent } from 'vitest/browser'

import { Editor } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import type { EditorValue, EditorVariable, JSONContent } from '../schema'
import { MOD } from './testUtils'

const LABEL = 'Newsletter'
const TICKETS = 'https://www.oztix.com.au/ochre-kite-weekender'

const VARIABLES: EditorVariable[] = [
  { key: 'first_name', label: 'First name', tokens: { ae: '#FirstName#' } },
  { key: 'last_name', label: 'Last name', tokens: { ae: '#LastName#' } },
  { key: 'event_name', label: 'Event name', tokens: { ae: '#EventName#' } }
]

// `{{` is how the keyboard syntax types one `{`.
const OPEN = '{{{{'

const email = (...content: JSONContent[]): EditorValue => ({
  version: 1,
  preset: 'email',
  doc: { type: 'doc', content }
})

const tag = (key: string, fallback?: string): JSONContent => ({
  type: 'variable',
  attrs: fallback === undefined ? { key } : { key, fallback }
})

function renderEmail(props: Partial<React.ComponentProps<typeof Editor>> = {}) {
  const onValueChange = vi.fn()
  render(
    <Editor
      aria-label={LABEL}
      preset='email'
      variables={VARIABLES}
      onValueChange={onValueChange}
      {...props}
    />
  )
  return onValueChange
}

async function focusedTextbox() {
  const textbox = await screen.findByRole('textbox', { name: LABEL })
  await userEvent.click(textbox)
  await waitFor(() => expect(textbox).toHaveFocus())
  return textbox
}

const mergeTagMenu = () => screen.findByRole('listbox', { name: 'Merge tags' })

const optionNames = (listbox: HTMLElement) =>
  within(listbox)
    .getAllByRole('option')
    .map((option) => option.textContent)

// The menus portal to the body, so React unmounts them before the body empties.
afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('Editor merge tags', () => {
  it('lists the variables on {{, and inserts the chosen one', async () => {
    const onValueChange = renderEmail()
    const textbox = await focusedTextbox()

    await userEvent.keyboard(`Hi ${OPEN}`)
    const listbox = await mergeTagMenu()
    expect(optionNames(listbox)).toEqual([
      'First name',
      'Last name',
      'Event name'
    ])
    expect(within(listbox).queryByRole('group')).toBe(null)
    expect(textbox).toHaveFocus()

    await userEvent.keyboard('{Enter}')

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email({
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hi ' }, tag('first_name')]
        })
      )
    )
    expect(screen.queryByRole('listbox')).toBe(null)
  })

  it('filters by label or key as you type', async () => {
    renderEmail()
    await focusedTextbox()

    await userEvent.keyboard(`${OPEN}event`)
    expect(optionNames(await mergeTagMenu())).toEqual(['Event name'])

    await userEvent.keyboard(
      '{Backspace}{Backspace}{Backspace}{Backspace}{Backspace}last_'
    )
    await waitFor(async () =>
      expect(optionNames(await mergeTagMenu())).toEqual(['Last name'])
    )
  })

  it('opens straight after a word, as {{ needs no space before it', async () => {
    const onValueChange = renderEmail()
    await focusedTextbox()

    await userEvent.keyboard(`Hey,${OPEN}first{Enter}`)

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email({
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hey,' }, tag('first_name')]
        })
      )
    )
  })

  it('leaves {{ as text without variables', async () => {
    renderEmail({ variables: undefined })
    const textbox = await focusedTextbox()

    await userEvent.keyboard(OPEN)

    // The menu opens in the transaction that types it, if at all.
    await waitFor(() => expect(textbox).toHaveTextContent('{{'))
    expect(screen.queryByRole('listbox')).toBe(null)
  })

  it('closes when focus leaves the editor', async () => {
    renderEmail()
    const textbox = await focusedTextbox()

    await userEvent.keyboard(OPEN)
    await mergeTagMenu()
    textbox.blur()

    await waitFor(() => expect(screen.queryByRole('listbox')).toBe(null))
    expect(textbox).not.toHaveAttribute('aria-controls')
  })

  it('lists variables that arrive after the editor is made', async () => {
    const props = { 'aria-label': LABEL, preset: 'email' } as const
    const { rerender } = render(<Editor {...props} />)
    await focusedTextbox()

    rerender(<Editor {...props} variables={VARIABLES} />)
    await userEvent.keyboard('/merge')
    const insert = await screen.findByRole('listbox', { name: 'Insert' })
    expect(optionNames(insert)).toEqual(['Merge tag'])
    await userEvent.keyboard('{Enter}')

    expect(optionNames(await mergeTagMenu())).toHaveLength(3)
  })

  it('inserts into a button’s label', async () => {
    const onValueChange = renderEmail({
      defaultValue: email({
        type: 'button',
        attrs: { href: TICKETS },
        content: [{ type: 'text', text: 'See your tickets' }]
      })
    })
    await screen.findByRole('textbox', { name: LABEL })
    await userEvent.click(screen.getByText('See your tickets'))
    await userEvent.keyboard(`{End}, ${OPEN}first{Enter}`)

    await waitFor(() =>
      expect(onValueChange.mock.lastCall?.[0].doc.content[0]).toEqual({
        type: 'button',
        attrs: { href: TICKETS },
        content: [
          { type: 'text', text: 'See your tickets, ' },
          tag('first_name')
        ]
      })
    )
  })

  it('offers Merge tag in the / menu, which opens the merge tag list', async () => {
    const onValueChange = renderEmail()
    await focusedTextbox()

    await userEvent.keyboard('/merge')
    const insert = await screen.findByRole('listbox', { name: 'Insert' })
    expect(optionNames(insert)).toEqual(['Merge tag'])
    await userEvent.keyboard('{Enter}')

    expect(optionNames(await mergeTagMenu())).toHaveLength(3)
    await userEvent.keyboard('{ArrowDown}{Enter}')

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email({ type: 'paragraph', content: [tag('last_name')] })
      )
    )
  })

  it.each(['basic', 'rich'] as const)(
    'offers no merge tags in %s, which can’t hold them',
    async (preset) => {
      render(
        <Editor aria-label={LABEL} preset={preset} variables={VARIABLES} />
      )
      const textbox = await focusedTextbox()

      await userEvent.keyboard(OPEN)
      await waitFor(() => expect(textbox).toHaveTextContent('{{'))
      expect(screen.queryByRole('listbox')).toBe(null)

      await userEvent.keyboard('{Backspace}{Backspace}/merge')
      await waitFor(() => expect(textbox).toHaveTextContent('/merge'))
      expect(screen.queryByRole('listbox')).toBe(null)
    }
  )

  it('offers no Merge tag in the blocks preset’s / menu', async () => {
    render(<Editor aria-label={LABEL} preset='blocks' variables={VARIABLES} />)
    await focusedTextbox()

    await userEvent.keyboard('/')
    const insert = await screen.findByRole('listbox', { name: 'Insert' })
    expect(optionNames(insert)).not.toContain('Merge tag')
  })

  it('offers no Merge tag in the / menu without variables', async () => {
    renderEmail({ variables: undefined })
    const textbox = await focusedTextbox()

    await userEvent.keyboard('/merge')

    await waitFor(() => expect(textbox).toHaveTextContent('/merge'))
    expect(screen.queryByRole('listbox')).toBe(null)
  })
})

describe('Editor merge tag fallbacks', () => {
  let style: HTMLStyleElement
  beforeAll(() => {
    style = document.createElement('style')
    style.textContent = roadieCss
    document.head.append(style)
  })
  afterAll(() => style.remove())

  const withFallback: EditorVariable[] = [
    { ...VARIABLES[0]!, fallback: 'there' },
    VARIABLES[1]!
  ]

  it('gives a tag its variable’s fallback as it’s inserted, and goes on in the text', async () => {
    const onValueChange = renderEmail({ variables: withFallback })
    await focusedTextbox()

    await userEvent.keyboard(`Hi ${OPEN}first{Enter}!`)

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email({
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hi ' },
            tag('first_name', 'there'),
            { type: 'text', text: '!' }
          ]
        })
      )
    )
    expect(screen.queryByRole('dialog')).toBe(null)
  })

  it('asks for a fallback as a tag without one is inserted, then goes on after it', async () => {
    const onValueChange = renderEmail({ variables: withFallback })
    const textbox = await focusedTextbox()

    await userEvent.keyboard(`Hi ${OPEN}last{Enter}`)
    const fallback = await screen.findByRole('textbox', { name: 'Fallback' })
    await waitFor(() => expect(fallback).toHaveFocus())
    await userEvent.keyboard('friend{Enter}')
    await waitFor(() => expect(textbox).toHaveFocus())
    await userEvent.keyboard('!')

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email({
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hi ' },
            tag('last_name', 'friend'),
            { type: 'text', text: '!' }
          ]
        })
      )
    )
  })

  it('shows the fallback beside the label, and marks a tag without one', async () => {
    renderEmail({
      defaultValue: email({
        type: 'paragraph',
        content: [tag('first_name', 'there'), tag('last_name')]
      })
    })
    const textbox = await screen.findByRole('textbox', { name: LABEL })

    const [named, bare] = Array.from(
      textbox.querySelectorAll<HTMLElement>('[data-slot="editor-variable"]')
    )
    await waitFor(() => expect(named).toHaveTextContent('First name·there'))
    const shown = within(named!).getByText('there')
    expect(getComputedStyle(shown).color).not.toBe(
      getComputedStyle(within(named!).getByText('First name')).color
    )
    expect(within(named!).queryByText('No fallback')).toBe(null)
    expect(within(bare!).getByTitle('No fallback')).toBeVisible()
  })
})

describe('Editor merge tag editing', () => {
  const greeting = email({
    type: 'paragraph',
    content: [{ type: 'text', text: 'Hi ' }, tag('first_name')]
  })

  async function selectChip() {
    await screen.findByRole('textbox', { name: LABEL })
    await userEvent.click(await screen.findByText('First name'))
    return screen.findByRole('toolbar', { name: 'Merge tag actions' })
  }

  async function editTag() {
    const actions = await selectChip()
    await userEvent.click(
      within(actions).getByRole('button', { name: 'Edit merge tag' })
    )
    return screen.findByRole('dialog', { name: 'Merge tag' })
  }

  async function changeTag(dialog: HTMLElement) {
    await userEvent.click(
      within(dialog).getByRole('combobox', { name: 'Shows' })
    )
    await userEvent.click(
      await screen.findByRole('option', { name: 'Last name' })
    )
    await userEvent.type(
      within(dialog).getByRole('textbox', { name: 'Fallback' }),
      'friend'
    )
  }

  const edited = email({
    type: 'paragraph',
    content: [{ type: 'text', text: 'Hi ' }, tag('last_name', 'friend')]
  })

  it('applies each change as it’s made, with no Save', async () => {
    const onValueChange = renderEmail({ defaultValue: greeting })
    const dialog = await editTag()

    await changeTag(dialog)

    await waitFor(() => expect(onValueChange).toHaveBeenLastCalledWith(edited))
    expect(dialog).toBeVisible()
    expect(within(dialog).queryByRole('button', { name: 'Save' })).toBe(null)
    expect(within(dialog).queryByRole('button', { name: 'Cancel' })).toBe(null)
  })

  it('keeps the changes on Enter, back in the text', async () => {
    const onValueChange = renderEmail({ defaultValue: greeting })
    await changeTag(await editTag())

    await userEvent.keyboard('{Enter}')

    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
    expect(onValueChange).toHaveBeenLastCalledWith(edited)
    expect(screen.getByRole('textbox', { name: LABEL })).toHaveFocus()
  })

  it('starts its title at the form’s edge, as the other settings do', async () => {
    renderEmail({ defaultValue: greeting })

    const dialog = await editTag()

    const title = within(dialog).getByRole('heading', { name: 'Merge tag' })
    // By class, as the test sheet compiles no text alignment to measure.
    const header = title.closest('[data-slot="popover-header"]')!
    expect(header).toHaveClass('text-start')
    expect(header).not.toHaveClass('text-center')
  })

  it('keeps the changes on a click outside', async () => {
    const onValueChange = renderEmail({ defaultValue: greeting })
    await changeTag(await editTag())

    await userEvent.click(screen.getByText('Hi'))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
    expect(onValueChange).toHaveBeenLastCalledWith(edited)
  })

  it('keeps the changes on Escape, which undo puts back in one step', async () => {
    const onValueChange = renderEmail({ defaultValue: greeting })
    await changeTag(await editTag())
    await waitFor(() => expect(onValueChange).toHaveBeenLastCalledWith(edited))

    await userEvent.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
    expect(onValueChange).toHaveBeenLastCalledWith(edited)
    expect(screen.getByRole('textbox', { name: LABEL })).toHaveFocus()

    await userEvent.keyboard(`{${MOD}>}z{/${MOD}}`)
    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(greeting)
    )
  })

  it('undoes every change it made in one step, and redoes them in one', async () => {
    const onValueChange = renderEmail({ defaultValue: greeting })
    await changeTag(await editTag())
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))

    await userEvent.keyboard(`{${MOD}>}z{/${MOD}}`)
    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(greeting)
    )

    await userEvent.keyboard(`{${MOD}>}{Shift>}z{/Shift}{/${MOD}}`)
    await waitFor(() => expect(onValueChange).toHaveBeenLastCalledWith(edited))
  })

  it('opens with the tag’s fallback, and clears it when emptied', async () => {
    const onValueChange = renderEmail({
      defaultValue: email({
        type: 'paragraph',
        content: [tag('first_name', 'friend')]
      })
    })
    const actions = await selectChip()

    await userEvent.click(
      within(actions).getByRole('button', { name: 'Edit merge tag' })
    )
    const fallback = await screen.findByRole('textbox', { name: 'Fallback' })
    expect(fallback).toHaveValue('friend')
    await userEvent.clear(fallback)
    await userEvent.keyboard('{Enter}')

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email({ type: 'paragraph', content: [tag('first_name')] })
      )
    )
  })

  it('saves the fallback without the spaces around it', async () => {
    const onValueChange = renderEmail({ defaultValue: greeting })
    const dialog = await editTag()

    await userEvent.type(
      within(dialog).getByRole('textbox', { name: 'Fallback' }),
      ' friend '
    )
    await userEvent.keyboard('{Enter}')

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email({
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hi ' }, tag('first_name', 'friend')]
        })
      )
    )
  })

  it('keeps a key the editor doesn’t list, as one of its choices', async () => {
    const onValueChange = renderEmail({
      defaultValue: email({ type: 'paragraph', content: [tag('ticket_count')] })
    })
    await screen.findByRole('textbox', { name: LABEL })
    await userEvent.click(await screen.findByText('ticket_count'))
    const actions = await screen.findByRole('toolbar', {
      name: 'Merge tag actions'
    })
    await userEvent.click(
      within(actions).getByRole('button', { name: 'Edit merge tag' })
    )
    const dialog = await screen.findByRole('dialog', { name: 'Merge tag' })

    await userEvent.click(
      within(dialog).getByRole('combobox', { name: 'Shows' })
    )
    await userEvent.click(
      await screen.findByRole('option', { name: 'ticket_count' })
    )
    await userEvent.type(
      within(dialog).getByRole('textbox', { name: 'Fallback' }),
      'some{Enter}'
    )

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email({ type: 'paragraph', content: [tag('ticket_count', 'some')] })
      )
    )
  })

  it('removes the tag', async () => {
    const onValueChange = renderEmail({ defaultValue: greeting })
    const actions = await selectChip()

    await userEvent.click(
      within(actions).getByRole('button', { name: 'Remove merge tag' })
    )

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        email({ type: 'paragraph', content: [{ type: 'text', text: 'Hi ' }] })
      )
    )
  })
})
