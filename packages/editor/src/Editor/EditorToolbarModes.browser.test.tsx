import { useState } from 'react'

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

import { Editor, type EditorProps } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import type { EditorValue, Preset } from '../schema'
import { LINE_END, clickIntoEditor, selectParagraph } from './testUtils'
import type { EditorToolbarMode } from './variants'

const LABEL = 'Event description'
const DOCKED = 'Formatting'
const FLOATING = 'Selection formatting'
const TEXT = 'Gates open at 4pm'

let style: HTMLStyleElement
beforeAll(() => {
  style = document.createElement('style')
  style.textContent = roadieCss
  document.head.append(style)
})
afterAll(() => style.remove())
afterEach(() => page.viewport(1280, 800))

const paragraph = (text: string) => ({
  type: 'paragraph',
  content: [{ type: 'text', text }]
})

function valueIn(preset: Preset): EditorValue {
  return {
    version: 1,
    preset,
    doc: {
      type: 'doc',
      content: [paragraph('Ochre Kite Weekender'), paragraph(TEXT)]
    }
  }
}

// Room above, where a floating toolbar shows over the selection.
function Page(props: Partial<EditorProps>) {
  return (
    <div style={{ paddingTop: 96 }}>
      <Editor aria-label={LABEL} defaultValue={valueIn('rich')} {...props} />
    </div>
  )
}

async function selectText(text = TEXT) {
  const textbox = await screen.findByRole('textbox', { name: LABEL })
  await selectParagraph(within(textbox).getByText(text))
  return textbox
}

const toolbars = () =>
  screen.queryAllByRole('toolbar').map((toolbar) => toolbar.ariaLabel)

const floating = () => screen.findByRole('toolbar', { name: FLOATING })

async function moreMenu() {
  await userEvent.click(
    within(await floating()).getByRole('button', { name: 'More' })
  )
  return screen.findByRole('menu')
}

const menuItems = (menu: HTMLElement) =>
  within(menu)
    .getAllByRole('menuitem')
    .map(
      (item) => item.querySelector('[data-slot="menu-item-label"]')!.textContent
    )

describe('Editor toolbar modes', () => {
  it.each<[Preset, EditorToolbarMode]>([
    ['basic', 'docked'],
    ['basic', 'floating'],
    ['rich', 'docked'],
    ['rich', 'floating'],
    ['blocks', 'docked'],
    ['blocks', 'floating'],
    ['email', 'docked'],
    ['email', 'floating']
  ])(
    'shows one toolbar at a time in a %s editor, %s',
    async (preset, toolbar) => {
      render(<Page defaultValue={valueIn(preset)} toolbar={toolbar} />)
      const textbox = await screen.findByRole('textbox', { name: LABEL })

      if (toolbar === 'docked') {
        await screen.findByRole('toolbar', { name: DOCKED })
        await selectText()
        await waitFor(() =>
          expect(
            within(screen.getByRole('toolbar', { name: DOCKED })).getByRole(
              'button',
              { name: 'Bold' }
            )
          ).toBeEnabled()
        )
        expect(toolbars()).toEqual([DOCKED])
      } else {
        expect(textbox).toBeVisible()
        await selectText()
        await floating()
        expect(toolbars()).toEqual([FLOATING])
        expect(
          within(await floating()).getByRole('button', { name: 'Bold' })
        ).toBeEnabled()
      }
    }
  )

  it.each<[EditorToolbarMode, string]>([
    ['docked', DOCKED],
    ['floating', FLOATING]
  ])(
    'renders only the %s part when both are placed',
    async (toolbar, shown) => {
      render(
        <div style={{ paddingTop: 96 }}>
          <Editor
            aria-label={LABEL}
            defaultValue={valueIn('rich')}
            toolbar={toolbar}
          >
            <Editor.Toolbar />
            <Editor.Content />
            <Editor.BubbleMenu />
          </Editor>
        </div>
      )
      await selectText()

      await screen.findByRole('toolbar', { name: shown })
      await waitFor(() =>
        expect(
          within(screen.getByRole('toolbar', { name: shown })).getByRole(
            'button',
            { name: 'Bold' }
          )
        ).toBeEnabled()
      )
      expect(toolbars()).toEqual([shown])
    }
  )

  it('opens a blocks page with no box and a floating toolbar', async () => {
    render(<Editor aria-label={LABEL} preset='blocks' />)
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    const frame = textbox.closest('[data-slot="editor"]')!

    expect(frame).toHaveAttribute('data-emphasis', 'subtler')
    expect(screen.queryByRole('toolbar', { name: 'Formatting' })).toBeNull()
  })

  it('keeps a blocks page’s own emphasis and toolbar when given', async () => {
    render(
      <Editor
        aria-label={LABEL}
        preset='blocks'
        emphasis='normal'
        toolbar='docked'
      />
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })

    expect(textbox.closest('[data-slot="editor"]')).toHaveAttribute(
      'data-emphasis',
      'normal'
    )
    expect(
      await screen.findByRole('toolbar', { name: 'Formatting' })
    ).toBeVisible()
  })

  it('docks a floating editor on a phone, with nothing to pin', async () => {
    await page.viewport(390, 700)
    render(<Page toolbar='floating' pinnable />)
    const docked = await screen.findByRole('toolbar', { name: DOCKED })
    await selectText()

    await waitFor(() =>
      expect(within(docked).getByRole('button', { name: 'Bold' })).toBeEnabled()
    )
    expect(toolbars()).toEqual([DOCKED])
    expect(
      within(docked).queryByRole('button', { name: 'Unpin toolbar' })
    ).toBe(null)
  })
})

describe('Floating toolbar’s More menu', () => {
  it('holds the inserts and history the docked bar has, then custom controls', async () => {
    render(
      <div style={{ paddingTop: 96 }}>
        <Editor
          aria-label={LABEL}
          defaultValue={valueIn('rich')}
          toolbar='floating'
        >
          <Editor.Toolbar>
            <Toolbar.Button>Add doors time</Toolbar.Button>
          </Editor.Toolbar>
          <Editor.Content />
          <Editor.BubbleMenu />
        </Editor>
      </div>
    )
    await selectText()
    const menu = await moreMenu()

    expect(menuItems(menu)).toEqual([
      'Divider',
      'Embed',
      'Table',
      'Undo',
      'Redo'
    ])
    await waitFor(() =>
      expect(
        within(menu).getByRole('button', { name: 'Add doors time' })
      ).toBeVisible()
    )
    expect(within(menu).queryByText('Pin toolbar to top')).toBe(null)
  })

  it('closes on Escape, and hides once the selection collapses', async () => {
    render(<Page toolbar='floating' />)
    const textbox = await selectText()
    await moreMenu()

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('menu')).toBe(null))
    await waitFor(() => expect(textbox).toHaveFocus())
    await userEvent.keyboard('{ArrowRight}')

    await waitFor(() =>
      expect(screen.queryByRole('toolbar', { name: FLOATING })).toBe(null)
    )
  })

  it('inserts after the selected text, keeping it', async () => {
    const onValueChange = vi.fn()
    render(<Page toolbar='floating' onValueChange={onValueChange} />)
    await selectText()
    const menu = await moreMenu()

    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Table' }))

    await waitFor(() => expect(onValueChange).toHaveBeenCalled())
    const doc = (onValueChange.mock.lastCall![0] as EditorValue).doc
    expect(doc.content?.slice(0, 2)).toEqual([
      paragraph('Ochre Kite Weekender'),
      paragraph(TEXT)
    ])
    expect(doc.content?.map((block) => block.type)).toContain('table')
  })

  it.each<Preset>(['basic', 'email'])(
    'holds Undo and Redo in a %s editor',
    async (preset) => {
      render(<Page defaultValue={valueIn(preset)} toolbar='floating' />)
      await selectText()

      expect(menuItems(await moreMenu())).toEqual(['Undo', 'Redo'])
    }
  )
})

describe('Pinning the toolbar', () => {
  it('pins and unpins on its own when uncontrolled', async () => {
    const onToolbarChange = vi.fn()
    render(
      <Page
        defaultToolbar='floating'
        pinnable
        onToolbarChange={onToolbarChange}
      />
    )
    const textbox = await selectText()
    const menu = await moreMenu()

    await userEvent.click(
      within(menu).getByRole('menuitem', { name: 'Pin toolbar to top' })
    )

    const docked = await screen.findByRole('toolbar', { name: DOCKED })
    expect(onToolbarChange).toHaveBeenLastCalledWith('docked')
    await waitFor(() => expect(textbox).toHaveFocus())

    await userEvent.click(
      within(docked).getByRole('button', { name: 'Unpin toolbar' })
    )

    await waitFor(() =>
      expect(screen.queryByRole('toolbar', { name: DOCKED })).toBe(null)
    )
    expect(onToolbarChange).toHaveBeenLastCalledWith('floating')
    await waitFor(() => expect(textbox).toHaveFocus())
  })

  it('asks the app to pin when controlled, and follows its choice', async () => {
    const onToolbarChange = vi.fn()
    function Controlled() {
      const [toolbar, setToolbar] = useState<EditorToolbarMode>('floating')
      return (
        <Page
          toolbar={toolbar}
          pinnable
          onToolbarChange={(next) => {
            onToolbarChange(next)
            setToolbar(next)
          }}
        />
      )
    }
    render(<Controlled />)
    await selectText()

    await userEvent.click(
      within(await moreMenu()).getByRole('menuitem', {
        name: 'Pin toolbar to top'
      })
    )

    const docked = await screen.findByRole('toolbar', { name: DOCKED })
    expect(onToolbarChange).toHaveBeenCalledExactlyOnceWith('docked')
    await userEvent.click(
      within(docked).getByRole('button', { name: 'Unpin toolbar' })
    )
    await waitFor(() =>
      expect(screen.queryByRole('toolbar', { name: DOCKED })).toBe(null)
    )
    expect(onToolbarChange).toHaveBeenLastCalledWith('floating')
  })

  it('stays put when controlled and the app keeps its choice', async () => {
    const onToolbarChange = vi.fn()
    render(<Page toolbar='docked' pinnable onToolbarChange={onToolbarChange} />)
    const docked = await screen.findByRole('toolbar', { name: DOCKED })

    await userEvent.click(
      within(docked).getByRole('button', { name: 'Unpin toolbar' })
    )

    expect(onToolbarChange).toHaveBeenCalledExactlyOnceWith('floating')
    expect(screen.getByRole('toolbar', { name: DOCKED })).toBeVisible()
  })

  it('offers no Unpin on a docked bar that isn’t pinnable', async () => {
    render(<Page />)
    const docked = await screen.findByRole('toolbar', { name: DOCKED })

    expect(
      within(docked).queryByRole('button', { name: 'Unpin toolbar' })
    ).toBe(null)
  })
})

describe('Floating toolbar keys', () => {
  it('opens at the caret with Alt+F10, and Escape closes it, putting the caret back', async () => {
    const onValueChange = vi.fn()
    render(<Page toolbar='floating' onValueChange={onValueChange} />)
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await clickIntoEditor(within(textbox).getByText(TEXT))
    await userEvent.keyboard(LINE_END)

    await userEvent.keyboard('{Alt>}{F10}{/Alt}')

    const toolbar = await floating()
    await waitFor(() =>
      expect(
        within(toolbar).getByRole('button', { name: /^Block type/ })
      ).toHaveFocus()
    )
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(textbox).toHaveFocus())
    await waitFor(() =>
      expect(screen.queryByRole('toolbar', { name: FLOATING })).toBe(null)
    )
    await userEvent.keyboard(', rain or shine')
    await waitFor(() =>
      expect(
        (onValueChange.mock.lastCall![0] as EditorValue).doc.content?.[1]
      ).toEqual(paragraph(`${TEXT}, rain or shine`))
    )
  })

  it('keeps the toolbar opened at the caret while its Block type menu is open', async () => {
    const onValueChange = vi.fn()
    render(<Page toolbar='floating' onValueChange={onValueChange} />)
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await clickIntoEditor(within(textbox).getByText(TEXT))
    await userEvent.keyboard('{Alt>}{F10}{/Alt}')
    const toolbar = await floating()
    await waitFor(() =>
      expect(
        within(toolbar).getByRole('button', { name: /^Block type/ })
      ).toHaveFocus()
    )

    await userEvent.keyboard('{Enter}')
    await userEvent.click(
      await screen.findByRole('menuitemradio', { name: 'Heading 2' })
    )

    await waitFor(() =>
      expect(
        (onValueChange.mock.lastCall![0] as EditorValue).doc.content?.[1]
      ).toEqual({
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: TEXT }]
      })
    )
  })
})
