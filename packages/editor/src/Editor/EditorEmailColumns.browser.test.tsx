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
import type { EditorValue, JSONContent } from '../schema'
import { MOD, selectParagraph } from './testUtils'

const LABEL = 'Newsletter'

let style: HTMLStyleElement
beforeAll(() => {
  style = document.createElement('style')
  style.textContent = `${roadieCss} body { padding-inline: 96px; }`
  document.head.append(style)
})
afterAll(() => style.remove())
afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

const p = (text: string): JSONContent => ({
  type: 'paragraph',
  content: [{ type: 'text', text }]
})
const column = (text: string): JSONContent => ({
  type: 'column',
  content: [p(text)]
})
const row = (...texts: string[]): JSONContent => ({
  type: 'columns',
  content: texts.map(column)
})

function renderEmail(...content: JSONContent[]) {
  const onValueChange = vi.fn()
  render(
    <Editor
      aria-label={LABEL}
      defaultValue={{
        version: 1,
        preset: 'email',
        doc: { type: 'doc', content }
      }}
      onValueChange={onValueChange}
    />
  )
  return onValueChange
}

const lastDoc = (onValueChange: ReturnType<typeof vi.fn>) =>
  (onValueChange.mock.lastCall![0] as EditorValue).doc.content!

const texts = (node: JSONContent) =>
  (node.content ?? []).map((child) => child.content?.[0]?.content?.[0]?.text)

async function clickText(text: string) {
  await screen.findByRole('textbox', { name: LABEL })
  await userEvent.click(await screen.findByText(text))
}

describe('Editor email columns', () => {
  it('keeps a block’s grip in the gap before its column, with no add button', async () => {
    renderEmail(row('Lineup', 'Tickets'))
    await clickText('Tickets')

    const grip = await screen.findByRole('button', { name: 'Block actions' })
    const textbox = screen.getByRole('textbox', { name: LABEL })
    const [left, right] = [
      ...textbox.querySelectorAll('[data-type="column"]')
    ].map((element) => element.getBoundingClientRect())

    await waitFor(() => {
      const box = grip.getBoundingClientRect()
      expect(box.left).toBeGreaterThanOrEqual(left!.right)
      expect(box.right).toBeLessThanOrEqual(right!.left + 1)
    })
    expect(screen.queryByRole('button', { name: 'Add block' })).toBe(null)
  })

  it('moves, copies and deletes a whole column from its grip', async () => {
    const onValueChange = renderEmail(row('Lineup', 'Tickets'))
    await clickText('Lineup')

    await userEvent.click(
      await screen.findByRole('button', { name: 'Column actions' })
    )
    const menu = await screen.findByRole('menu')
    expect(
      within(menu).getByRole('menuitem', { name: 'Delete' })
    ).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(
      within(menu).getByRole('menuitem', { name: 'Move right' })
    )
    await waitFor(() =>
      expect(texts(lastDoc(onValueChange)[0]!)).toEqual(['Tickets', 'Lineup'])
    )
    await userEvent.click(
      within(await screen.findByRole('menu')).getByRole('menuitem', {
        name: 'Duplicate'
      })
    )
    await waitFor(() =>
      expect(texts(lastDoc(onValueChange)[0]!)).toEqual([
        'Tickets',
        'Lineup',
        'Lineup'
      ])
    )

    await userEvent.click(await screen.findByText('Tickets'))
    await userEvent.click(
      await screen.findByRole('button', { name: 'Column actions' })
    )
    await userEvent.click(
      within(await screen.findByRole('menu')).getByRole('menuitem', {
        name: 'Delete'
      })
    )
    await waitFor(() =>
      expect(texts(lastDoc(onValueChange)[0]!)).toEqual(['Lineup', 'Lineup'])
    )
  })

  it('reaches the column’s actions by keyboard, from the block menu', async () => {
    const onValueChange = renderEmail(row('Lineup', 'Tickets'))
    await clickText('Lineup')

    await userEvent.keyboard(`{${MOD}>}/{/${MOD}}`)
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Column actions' })
    )
    const menu = await screen.findByRole('menu')
    await waitFor(() =>
      expect(within(menu).getByRole('group', { name: 'Column' })).toBeVisible()
    )
    await userEvent.click(
      within(menu).getByRole('menuitem', { name: 'Move right' })
    )

    await waitFor(() =>
      expect(texts(lastDoc(onValueChange)[0]!)).toEqual(['Tickets', 'Lineup'])
    )
  })

  it('sets the columns’ layout and their order on a phone from their toolbar', async () => {
    const onValueChange = renderEmail(row('Lineup', 'Tickets'))
    await clickText('Lineup')

    await userEvent.click(
      await screen.findByRole('button', { name: 'Layout: Equal' })
    )
    await userEvent.click(
      await screen.findByRole('menuitemradio', { name: 'Wide left (2:1)' })
    )
    await waitFor(() =>
      expect(lastDoc(onValueChange)[0]!.attrs).toEqual({ layout: 'wide-left' })
    )
    await userEvent.click(
      await screen.findByRole('button', { name: 'Stack on phone: Left first' })
    )
    await userEvent.click(
      await screen.findByRole('menuitemradio', { name: 'Right first' })
    )

    await waitFor(() =>
      expect(lastDoc(onValueChange)[0]!.attrs).toEqual({
        layout: 'wide-left',
        stack: 'reverse'
      })
    )
  })

  it('centres a paragraph from the toolbar, and back', async () => {
    const onValueChange = renderEmail(p('Gates 11am'))
    await screen.findByRole('textbox', { name: LABEL })
    await selectParagraph(await screen.findByText('Gates 11am'))
    const centre = await screen.findByRole('button', { name: 'Centre' })

    await userEvent.click(centre)
    await waitFor(() =>
      expect(lastDoc(onValueChange)[0]!.attrs).toEqual({ align: 'center' })
    )
    expect(centre).toHaveAttribute('aria-pressed', 'true')
    expect(
      getComputedStyle(await screen.findByText('Gates 11am')).textAlign
    ).toBe('center')

    await userEvent.click(centre)
    await waitFor(() =>
      expect(lastDoc(onValueChange)[0]!.attrs).toBe(undefined)
    )
  })
})
