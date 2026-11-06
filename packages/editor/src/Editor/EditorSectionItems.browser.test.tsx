import { render, screen, waitFor, within } from '@testing-library/react'
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  onTestFinished,
  vi
} from 'vitest'
import { userEvent, page as viewport } from 'vitest/browser'

import { Editor } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import type { EditorSection } from '../extensions'
import type { EditorValue } from '../schema'
import { MOD, clickIntoEditor } from './testUtils'

const LABEL = 'Page'

let style: HTMLStyleElement
beforeAll(() => {
  style = document.createElement('style')
  style.textContent = `${roadieCss} body { padding-inline: 64px; }`
  document.head.append(style)
})
afterAll(() => style.remove())

type Act = { name: string; note?: string }

const ACTS: Act[] = [
  { name: 'Velvet Kookaburra' },
  { name: 'Marri Lane' },
  { name: 'Kazoo Hollow' }
]

const lineup: EditorSection = {
  name: 'lineup',
  label: 'Lineup',
  attrs: { title: 'Lineup', acts: ACTS, buttons: [] },
  settings: [
    { name: 'title', label: 'Title', type: 'text' },
    {
      name: 'acts',
      label: 'Acts',
      type: 'list',
      itemLabel: 'Act',
      fields: [
        { name: 'name', label: 'Name', type: 'text' },
        { name: 'note', label: 'Note', type: 'text', multiline: true }
      ]
    },
    {
      name: 'buttons',
      label: 'Buttons',
      type: 'list',
      itemLabel: 'Button',
      item: 'action'
    }
  ],
  // A blank act shows its item's name while edited, as the catalogue's do.
  render: ({ attrs, editing, editingItem }) => (
    <section>
      <h2>{String(attrs.title)}</h2>
      <ul>
        {(attrs.acts as Act[]).map(({ name }, index) => (
          <li
            key={index}
            data-open={editingItem === `acts.${index}` ? '' : undefined}
            style={{ paddingBlock: 24 }}
          >
            {name || (editing ? 'Act' : '')}
          </li>
        ))}
      </ul>
    </section>
  )
}

const page = (...content: object[]): EditorValue => ({
  version: 1,
  preset: 'blocks',
  doc: { type: 'doc', content }
})

const intro = {
  type: 'paragraph',
  attrs: { blockId: 'intro' },
  content: [{ type: 'text', text: 'Doors 7pm' }]
}

const savedLineup = { type: 'lineup', attrs: { blockId: 'lineup' } }

function renderPage(value = page(intro, savedLineup)) {
  const onValueChange = vi.fn()
  render(
    <Editor
      aria-label={LABEL}
      sections={[lineup]}
      defaultValue={value}
      onValueChange={onValueChange}
    />
  )
  return onValueChange
}

const lastSection = (onValueChange: ReturnType<typeof vi.fn>) =>
  (onValueChange.mock.lastCall![0] as EditorValue).doc.content!.find(
    ({ type }) => type === 'lineup'
  )

const namesOf = (onValueChange: ReturnType<typeof vi.fn>) =>
  (lastSection(onValueChange)?.attrs?.acts as Act[] | undefined)?.map(
    ({ name }) => name
  )

const act = (name: string) => screen.findByText(name, { selector: 'li' })

// What a section draws is inert, so the click is forced through to it.
const clickAct = async (name: string) =>
  userEvent.click(await act(name), { force: true })

const undo = () => userEvent.keyboard(`{${MOD}>}z{/${MOD}}`)
const redo = () => userEvent.keyboard(`{${MOD}>}{Shift>}z{/Shift}{/${MOD}}`)

describe('Editor section items', () => {
  it('removes an item as a step of its own, which Undo in the drawer brings back', async () => {
    const onValueChange = renderPage()
    await clickAct('Marri Lane')
    const drawer = await screen.findByRole('dialog', {
      name: 'Lineup settings'
    })
    await userEvent.type(
      within(drawer).getByRole('textbox', { name: 'Title' }),
      '!'
    )

    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Remove Marri Lane' })
    )
    await waitFor(() =>
      expect(namesOf(onValueChange)).toEqual([
        'Velvet Kookaburra',
        'Kazoo Hollow'
      ])
    )
    expect(
      within(drawer).getByRole('button', { name: 'Kazoo Hollow' })
    ).toHaveFocus()

    await undo()

    await waitFor(() =>
      expect(namesOf(onValueChange)).toEqual(ACTS.map(({ name }) => name))
    )
    expect(lastSection(onValueChange)?.attrs?.title).toBe('Lineup!')
    expect(
      screen.getByRole('dialog', { name: 'Lineup settings' })
    ).toBeVisible()
    expect(
      within(drawer).getByRole('button', { name: 'Remove Marri Lane' })
    ).toBeVisible()

    await redo()

    await waitFor(() =>
      expect(namesOf(onValueChange)).toEqual([
        'Velvet Kookaburra',
        'Kazoo Hollow'
      ])
    )
    expect(lastSection(onValueChange)?.attrs?.title).toBe('Lineup!')
  })

  it('brings back an item removed from a section added this visit, never the section', async () => {
    const onValueChange = renderPage(page(intro))
    await clickIntoEditor(await screen.findByText('Doors 7pm'))
    await userEvent.keyboard('{End}{Enter}/lineup{Enter}')
    await clickAct('Kazoo Hollow')
    const drawer = await screen.findByRole('dialog', {
      name: 'Lineup settings'
    })

    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Remove Kazoo Hollow' })
    )
    await waitFor(() =>
      expect(namesOf(onValueChange)).toEqual([
        'Velvet Kookaburra',
        'Marri Lane'
      ])
    )
    expect(
      within(drawer).getByRole('button', { name: 'Marri Lane' })
    ).toHaveFocus()

    await undo()
    await waitFor(() =>
      expect(namesOf(onValueChange)).toEqual(ACTS.map(({ name }) => name))
    )
    // Past the visit's own steps, it leaves the section where it is.
    await undo()

    expect(namesOf(onValueChange)).toEqual(ACTS.map(({ name }) => name))
    expect(
      screen.getByRole('dialog', { name: 'Lineup settings' })
    ).toBeVisible()
  })

  it('focuses Add once the last item goes', async () => {
    renderPage(
      page(intro, {
        type: 'lineup',
        attrs: { blockId: 'lineup', acts: [{ name: 'Marri Lane' }] }
      })
    )
    await clickAct('Marri Lane')
    const drawer = await screen.findByRole('dialog', {
      name: 'Lineup settings'
    })

    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Remove Marri Lane' })
    )

    expect(
      within(drawer).getByRole('button', { name: 'Add act' })
    ).toHaveFocus()
  })

  it('tells the section which item is open in its drawer', async () => {
    renderPage()

    await clickAct('Marri Lane')
    await screen.findByRole('dialog', { name: 'Lineup settings' })

    await waitFor(() =>
      expect(
        screen.getByText('Marri Lane', { selector: 'li' })
      ).toHaveAttribute('data-open')
    )
    expect(
      screen.getByText('Velvet Kookaburra', { selector: 'li' })
    ).not.toHaveAttribute('data-open')
  })

  it('names a button item once, in its fold', async () => {
    renderPage(
      page(intro, {
        type: 'lineup',
        attrs: {
          blockId: 'lineup',
          buttons: [{ label: 'Tickets', href: '/tickets' }]
        }
      })
    )
    await clickAct('Marri Lane')
    const drawer = await screen.findByRole('dialog', {
      name: 'Lineup settings'
    })

    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Tickets' })
    )

    expect(within(drawer).getByRole('textbox', { name: 'Label' })).toHaveValue(
      'Tickets'
    )
    expect(within(drawer).getAllByText('Tickets')).toHaveLength(1)
  })

  it('shows a link as it was once Undo takes its edit back', async () => {
    renderPage(
      page(intro, {
        type: 'lineup',
        attrs: {
          blockId: 'lineup',
          buttons: [{ label: 'Tickets', href: '/tickets' }]
        }
      })
    )
    await clickAct('Marri Lane')
    const drawer = await screen.findByRole('dialog', {
      name: 'Lineup settings'
    })
    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Tickets' })
    )
    const link = within(drawer).getByRole('textbox', { name: 'Link' })
    await userEvent.type(link, '/vip')
    expect(link).toHaveValue('/tickets/vip')

    await undo()

    await waitFor(() => expect(link).toHaveValue('/tickets'))
  })

  it('leaves Mod+Z to an IME while it composes', async () => {
    const onValueChange = renderPage()
    await clickAct('Marri Lane')
    const drawer = await screen.findByRole('dialog', {
      name: 'Lineup settings'
    })
    const title = within(drawer).getByRole('textbox', { name: 'Title' })
    await userEvent.type(title, '!')
    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Remove Marri Lane' })
    )
    await waitFor(() => expect(namesOf(onValueChange)).toHaveLength(2))

    title.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'z',
        metaKey: MOD === 'Meta',
        ctrlKey: MOD === 'Control',
        isComposing: true,
        bubbles: true
      })
    )
    await userEvent.type(title, '?')

    expect(namesOf(onValueChange)).toHaveLength(2)
    expect(lastSection(onValueChange)?.attrs?.title).toBe('Lineup!?')
  })

  it('tells only the selected section which item is open', async () => {
    renderPage(page(intro, savedLineup, { ...savedLineup, attrs: {} }))
    const [, other] = await screen.findAllByText('Marri Lane', {
      selector: 'li'
    })

    await userEvent.click(other!, { force: true })
    await screen.findByRole('dialog', { name: 'Lineup settings' })

    await waitFor(() => expect(other).toHaveAttribute('data-open'))
    const [first] = screen.getAllByText('Marri Lane', { selector: 'li' })
    expect(first).not.toHaveAttribute('data-open')
  })
})

const tap = (element: Element) => {
  const box = element.getBoundingClientRect()
  const at = { clientX: box.left + 4, clientY: box.top + box.height / 2 }
  element.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      pointerType: 'touch',
      button: 0,
      ...at
    })
  )
  element.dispatchEvent(
    new MouseEvent('mousedown', { bubbles: true, button: 0, ...at })
  )
  element.dispatchEvent(
    new MouseEvent('mouseup', { bubbles: true, button: 0, ...at })
  )
}

const manyActs = Array.from({ length: 8 }, (_, index) => ({
  name: `Act ${index + 1} of the night`,
  note: 'Doors 7pm'
}))

describe('Editor section items on a phone', () => {
  it('opens its sheet at the item tapped, without raising the keyboard', async () => {
    await viewport.viewport(390, 700)
    onTestFinished(() => viewport.viewport(1280, 800))
    renderPage(
      page(intro, {
        type: 'lineup',
        attrs: { blockId: 'lineup', acts: manyActs }
      })
    )
    const tapped = await act('Act 7 of the night')
    tap(tapped)
    await waitFor(() =>
      expect(tapped.closest('.ProseMirror-selectednode')).not.toBe(null)
    )
    tap(tapped)

    const sheet = await screen.findByRole('dialog', {
      name: 'Lineup settings'
    })
    const name = await within(sheet).findByDisplayValue('Act 7 of the night')
    await waitFor(() => {
      const field = name.getBoundingClientRect()
      const shown = sheet.getBoundingClientRect()
      expect(field.top).toBeGreaterThanOrEqual(shown.top)
      expect(field.bottom).toBeLessThanOrEqual(shown.bottom)
    })
    expect(document.activeElement?.matches('input, textarea')).toBe(false)
    expect(tapped).toHaveAttribute('data-open')
  })

  it('keeps an item just added above the sheet while it’s typed', async () => {
    await viewport.viewport(390, 700)
    onTestFinished(() => viewport.viewport(1280, 800))
    renderPage(
      page(intro, {
        type: 'lineup',
        attrs: { blockId: 'lineup', acts: manyActs }
      })
    )
    const first = await act('Act 1 of the night')
    tap(first)
    await waitFor(() =>
      expect(first.closest('.ProseMirror-selectednode')).not.toBe(null)
    )
    tap(first)
    const sheet = await screen.findByRole('dialog', {
      name: 'Lineup settings'
    })

    await userEvent.click(
      within(sheet).getByRole('button', { name: 'Add act' })
    )
    await userEvent.keyboard('Pink')

    const added = await act('Pink')
    await waitFor(() => {
      const box = added.getBoundingClientRect()
      expect(box.top).toBeGreaterThanOrEqual(0)
      expect(box.bottom).toBeLessThanOrEqual(sheet.getBoundingClientRect().top)
    })
  })
})
