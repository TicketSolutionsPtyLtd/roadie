import { render, screen, waitFor, within } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'
import { page, userEvent } from 'vitest/browser'

import { Toolbar } from '@oztix/roadie-components/toolbar'

import { Editor } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import type { EditorValue, Preset } from '../schema'

const LABEL = 'Event description'
const TEXT = 'Gates open at 4pm'

let style: HTMLStyleElement
beforeAll(() => {
  style = document.createElement('style')
  style.textContent = roadieCss
  document.head.append(style)
})
afterAll(() => style.remove())
afterEach(() => page.viewport(1280, 800))

const valueIn = (preset: Preset): EditorValue => ({
  version: 1,
  preset,
  doc: {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: TEXT }] }]
  }
})

async function shownToolbar() {
  const toolbar = await screen.findByRole('toolbar', { name: 'Formatting' })
  await waitFor(() => expect(toolbar).toBeVisible())
  return toolbar
}

const controls = (toolbar: HTMLElement) =>
  within(toolbar)
    .getAllByRole('button')
    .map((button) => button.ariaLabel ?? button.textContent)

const rows = (toolbar: HTMLElement) =>
  new Set(
    within(toolbar)
      .getAllByRole('button')
      .map((button) => Math.round(button.getBoundingClientRect().top))
  ).size

const barOf = (toolbar: HTMLElement) =>
  toolbar.closest<HTMLElement>('[data-slot="editor-toolbar"]')!

function fitsItsBar(toolbar: HTMLElement) {
  const bar = barOf(toolbar).getBoundingClientRect()
  for (const button of within(toolbar).getAllByRole('button')) {
    const box = button.getBoundingClientRect()
    expect(box.left).toBeGreaterThanOrEqual(bar.left)
    expect(box.right).toBeLessThanOrEqual(bar.right)
  }
}

async function moreMenu(toolbar: HTMLElement) {
  await userEvent.click(within(toolbar).getByRole('button', { name: 'More' }))
  return screen.findByRole('menu')
}

const menuLabels = (menu: HTMLElement) =>
  Array.from(menu.querySelectorAll('[data-slot="menu-item-label"]')).map(
    (label) => label.textContent
  )

describe('Editor toolbar on a phone', () => {
  it('leads with the block type and keeps Undo, putting the rest behind More', async () => {
    await page.viewport(390, 700)
    render(<Editor aria-label={LABEL} defaultValue={valueIn('rich')} />)
    const toolbar = await shownToolbar()

    await waitFor(() => fitsItsBar(toolbar))
    const shown = controls(toolbar)
    expect(shown[0]).toMatch(/^Block type/)
    expect(shown.slice(-2)).toEqual(['Undo', 'More'])
    expect(rows(toolbar)).toBe(1)

    const menu = await moreMenu(toolbar)
    expect(menuLabels(menu)).toEqual(
      expect.arrayContaining(['Divider', 'Embed', 'Table', 'Redo'])
    )
    for (const label of menuLabels(menu)) {
      expect(shown).not.toContain(label)
    }
  })

  it('leads with Blocks in a preset that has a Blocks drawer', async () => {
    await page.viewport(390, 700)
    render(
      <Editor
        aria-label={LABEL}
        defaultValue={valueIn('email')}
        toolbar='docked'
      />
    )
    const toolbar = await shownToolbar()

    await waitFor(() => fitsItsBar(toolbar))
    const shown = controls(toolbar)
    expect(shown[0]).toBe('Blocks')
    expect(shown[1]).toMatch(/^Block type/)
    expect(shown.slice(-2)).toEqual(['Undo', 'More'])
  })

  it('runs a control from More on the selected text, and shows it pressed', async () => {
    await page.viewport(390, 700)
    const onValueChange = vi.fn()
    render(
      <Editor
        aria-label={LABEL}
        defaultValue={valueIn('rich')}
        onValueChange={onValueChange}
      />
    )
    const toolbar = await shownToolbar()
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await userEvent.tripleClick(within(textbox).getByText(TEXT))
    await waitFor(() => fitsItsBar(toolbar))
    expect(menuLabels(await moreMenu(toolbar))).toContain('Numbered list')

    await userEvent.click(
      screen.getByRole('menuitemcheckbox', { name: 'Numbered list' })
    )
    await waitFor(() =>
      expect(
        (onValueChange.mock.lastCall![0] as EditorValue).doc.content?.[0]?.type
      ).toBe('orderedList')
    )
    await waitFor(() => expect(textbox).toHaveFocus())

    await moreMenu(toolbar)
    expect(
      screen.getByRole('menuitemcheckbox', { name: 'Numbered list' })
    ).toHaveAttribute('aria-checked', 'true')
  })
  it.each([false, true])(
    'brings every control back once the window widens again, pinnable %s',
    async (pinnable) => {
      await page.viewport(440, 700)
      render(
        <Editor
          aria-label={LABEL}
          defaultValue={valueIn('rich')}
          toolbar='docked'
          pinnable={pinnable}
        />
      )
      const toolbar = await shownToolbar()
      await waitFor(() =>
        expect(
          within(toolbar).getByRole('button', { name: 'More' })
        ).toBeVisible()
      )

      await page.viewport(1280, 800)

      await waitFor(() =>
        expect(controls(toolbar)).toEqual(
          expect.arrayContaining(['Undo', 'Redo'])
        )
      )
      expect(
        within(toolbar).queryByRole('button', { name: 'More' })
      ).not.toBeInTheDocument()
    }
  )

  it('keeps focus in the link editor opened from More', async () => {
    await page.viewport(320, 700)
    render(<Editor aria-label={LABEL} defaultValue={valueIn('rich')} />)
    const toolbar = await shownToolbar()
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await userEvent.tripleClick(within(textbox).getByText(TEXT))
    await waitFor(() => fitsItsBar(toolbar))
    await moreMenu(toolbar)

    await userEvent.click(
      screen.getByRole('menuitemcheckbox', { name: 'Link' })
    )

    const url = await screen.findByRole('textbox', { name: 'Link' })
    await waitFor(() => expect(url).toHaveFocus())
    await userEvent.keyboard('oztix.com.au')
    expect(url).toHaveValue('oztix.com.au')
  })
})

describe('Editor toolbar in a narrow column', () => {
  it('keeps one row, moving Redo behind More rather than wrapping it', async () => {
    render(
      <div style={{ width: 440 }}>
        <Editor aria-label={LABEL} defaultValue={valueIn('rich')} />
      </div>
    )
    const toolbar = await shownToolbar()

    await waitFor(() => expect(rows(toolbar)).toBe(1))
    fitsItsBar(toolbar)
    expect(controls(toolbar)).toContain('Undo')
    expect(menuLabels(await moreMenu(toolbar))).toContain('Redo')
  })

  it('shows every control and no More where they fit', async () => {
    render(<Editor aria-label={LABEL} defaultValue={valueIn('rich')} />)
    const toolbar = await shownToolbar()

    await waitFor(() =>
      expect(controls(toolbar).slice(-2)).toEqual(['Undo', 'Redo'])
    )
    expect(
      within(toolbar).queryByRole('button', { name: 'More' })
    ).not.toBeInTheDocument()
  })

  it('keeps an app’s own controls on the bar', async () => {
    render(
      <div style={{ width: 400 }}>
        <Editor aria-label={LABEL} defaultValue={valueIn('rich')}>
          <Editor.Toolbar>
            <Toolbar.Button>Add doors time</Toolbar.Button>
          </Editor.Toolbar>
          <Editor.Content />
        </Editor>
      </div>
    )
    const toolbar = await shownToolbar()

    await waitFor(() => fitsItsBar(toolbar))
    expect(
      within(toolbar).getByRole('button', { name: 'Add doors time' })
    ).toBeVisible()
    expect(rows(toolbar)).toBe(1)
  })
})
