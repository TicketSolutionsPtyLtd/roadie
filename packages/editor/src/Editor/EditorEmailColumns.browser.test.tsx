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
  onTestFinished,
  vi
} from 'vitest'
import { page, userEvent } from 'vitest/browser'

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

  it('sets a stacked column’s grip off its text by the grip’s usual gap on a phone', async () => {
    await page.viewport(390, 700)
    onTestFinished(() => page.viewport(1280, 800))
    renderEmail(p('Doors 7pm'), row('Lineup', 'Tickets'))
    await clickText('Doors 7pm')
    const grip = await screen.findByRole('button', { name: 'Block actions' })
    const body = (await screen.findByText('Doors 7pm')).getBoundingClientRect()
    let bodyGap = 0
    await waitFor(() => {
      bodyGap = body.left - grip.getBoundingClientRect().right
      expect(bodyGap).toBeGreaterThan(0)
    })

    await clickText('Tickets')

    const text = (await screen.findByText('Tickets')).getBoundingClientRect()
    await waitFor(() =>
      expect(text.left - grip.getBoundingClientRect().right).toBeCloseTo(
        bodyGap,
        0
      )
    )
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
    const layoutMenu = await screen.findByRole('menu')
    await userEvent.click(
      await screen.findByRole('menuitemradio', { name: 'Wide left (2:1)' })
    )
    await waitFor(() =>
      expect(lastDoc(onValueChange)[0]!.attrs).toEqual({ layout: 'wide-left' })
    )
    const stackTrigger = await screen.findByRole('button', {
      name: 'Stack on phone: Left first'
    })
    await userEvent.click(stackTrigger)
    await screen.findByRole('menuitemradio', { name: 'Right first' })
    // The Layout menu leaves once its exit ends, with the Stack menu open.
    await waitFor(() => expect(layoutMenu).not.toBeInTheDocument())
    expect(stackTrigger).toBeInTheDocument()
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

  it('heads each of the columns’ toolbar menus with what it sets', async () => {
    renderEmail(row('Lineup', 'Tickets'))
    await clickText('Lineup')

    for (const [trigger, heading] of [
      ['Columns: 2 columns', 'Columns'],
      ['Layout: Equal', 'Layout'],
      ['Stack on phone: Left first', 'Stack on phone']
    ] as const) {
      await userEvent.click(
        await screen.findByRole('button', { name: trigger })
      )
      const menu = await screen.findByRole('menu')
      await waitFor(() =>
        expect(within(menu).getByRole('group', { name: heading })).toBeVisible()
      )
      expect(within(menu).getByText(heading)).toBeVisible()
      await userEvent.keyboard('{Escape}')
      await waitFor(() => expect(screen.queryByRole('menu')).toBe(null))
    }
  })

  it.each([
    [undefined, ['Lineup', 'Tickets', 'Doors']],
    ['reverse', ['Doors', 'Tickets', 'Lineup']]
  ] as const)(
    'moves a stacked column up and down on a phone (stack %s)',
    async (stack, shown) => {
      await page.viewport(390, 700)
      document.body.style.paddingInline = '0'
      onTestFinished(() => {
        document.body.style.paddingInline = ''
        return page.viewport(1280, 800)
      })
      const onValueChange = renderEmail({
        ...row('Lineup', 'Tickets', 'Doors'),
        attrs: { ...(stack && { stack }) }
      })
      await clickText('Tickets')
      const top = (text: string) =>
        screen.getByText(text).getBoundingClientRect().top
      expect([...shown].sort((a, b) => top(a) - top(b))).toEqual(shown)

      await userEvent.click(
        await screen.findByRole('button', { name: 'Column actions' })
      )
      const menu = await screen.findByRole('menu')
      expect(
        within(menu)
          .getAllByRole('menuitem')
          .map((item) => item.textContent)
      ).toEqual(['Move up', 'Move down', 'Duplicate', 'Delete'])
      await userEvent.click(
        within(menu).getByRole('menuitem', { name: 'Move up' })
      )

      // Up the screen, whichever way the row stacks.
      await waitFor(() => expect(top('Tickets')).toBeLessThan(top(shown[0])))
      expect(texts(lastDoc(onValueChange)[0]!)).toEqual(
        stack ? ['Lineup', 'Doors', 'Tickets'] : ['Tickets', 'Lineup', 'Doors']
      )
    }
  )

  it('puts the columns’ menus in one Layout menu on a phone, in about 200px', async () => {
    await page.viewport(390, 700)
    onTestFinished(() => page.viewport(1280, 800))
    const onValueChange = renderEmail(row('Lineup', 'Tickets'))
    await clickText('Lineup')

    const toolbar = await screen.findByRole('toolbar', {
      name: 'Columns actions'
    })
    await waitFor(() =>
      expect(toolbar.getBoundingClientRect().width).toBeLessThanOrEqual(200)
    )
    expect(within(toolbar).getAllByRole('button')).toHaveLength(1)
    await userEvent.click(
      within(toolbar).getByRole('button', { name: 'Layout' })
    )
    const menu = await screen.findByRole('menu')
    await waitFor(() => expect(menu).toBeVisible())
    for (const name of ['Columns', 'Layout', 'Stack on phone']) {
      expect(within(menu).getByRole('group', { name })).toBeVisible()
    }
    for (const name of ['2 columns', 'Equal', 'Left first']) {
      expect(within(menu).getByRole('menuitemradio', { name })).toHaveAttribute(
        'aria-checked',
        'true'
      )
    }
    await userEvent.click(
      within(menu).getByRole('menuitemradio', { name: 'Wide right (1:2)' })
    )

    await waitFor(() =>
      expect(lastDoc(onValueChange)[0]!.attrs).toEqual({ layout: 'wide-right' })
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
