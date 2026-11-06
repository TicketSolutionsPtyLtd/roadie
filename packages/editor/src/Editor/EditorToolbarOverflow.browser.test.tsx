import { render, screen, waitFor, within } from '@testing-library/react'
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

// Named ones only: WebKit counts an open menu's unnamed focus guards too.
const controls = (toolbar: HTMLElement) =>
  within(toolbar)
    .getAllByRole('button')
    .map((button) => button.ariaLabel ?? button.textContent)
    .filter(Boolean)

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
    const entries = Array.from(menu.querySelectorAll('[role]'))
    expect(entries[0]?.role).not.toBe('separator')
    expect(entries.at(-1)?.role).not.toBe('separator')
    expect(menuLabels(menu)).toEqual(
      expect.arrayContaining(['Divider', 'Embed', 'Table', 'Redo'])
    )
    for (const label of menuLabels(menu)) {
      expect(shown).not.toContain(label)
    }
  })

  it('keeps Link on the bar ahead of the controls before it', async () => {
    await page.viewport(360, 700)
    render(<Editor aria-label={LABEL} defaultValue={valueIn('rich')} />)
    const toolbar = await shownToolbar()

    await waitFor(() => fitsItsBar(toolbar))
    const shown = controls(toolbar)
    expect(shown).toContain('Link')
    expect(menuLabels(await moreMenu(toolbar))).not.toContain('Link')
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

  it('keeps focus in the embed editor opened from More', async () => {
    await page.viewport(320, 700)
    render(<Editor aria-label={LABEL} defaultValue={valueIn('rich')} />)
    const toolbar = await shownToolbar()
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await userEvent.click(within(textbox).getByText(TEXT))
    await waitFor(() => fitsItsBar(toolbar))
    await moreMenu(toolbar)

    await userEvent.click(screen.getByRole('menuitem', { name: 'Embed' }))

    const url = await screen.findByRole('textbox', {
      name: 'Video or audio link'
    })
    await waitFor(() => expect(url).toHaveFocus())
    await userEvent.keyboard('youtu.be')
    expect(url).toHaveValue('youtu.be')
  })
})

describe('Editor toolbar on a touch screen', () => {
  function onTouchScreen() {
    const matchMedia = window.matchMedia.bind(window)
    // Playwright can't emulate a touch screen's pointer.
    vi.spyOn(window, 'matchMedia').mockImplementation((query) =>
      matchMedia(
        query
          .replaceAll('(pointer: coarse)', 'all')
          .replaceAll('(any-pointer: fine)', 'not all')
      )
    )
    onTestFinished(() => {
      vi.restoreAllMocks()
    })
  }

  it('docks to the bottom of the screen, Blocks first, while the text has focus', async () => {
    onTouchScreen()
    await page.viewport(390, 700)
    render(
      <div>
        <Editor
          aria-label={LABEL}
          defaultValue={valueIn('email')}
          toolbar='docked'
        />
        <button type='button'>Save</button>
      </div>
    )
    const toolbar = await shownToolbar()
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    const at = () => toolbar.getBoundingClientRect()
    const textTop = textbox.getBoundingClientRect().top
    expect(at().bottom).toBeLessThan(textTop + 1)

    await userEvent.click(within(textbox).getByText(TEXT))

    const viewport = window.visualViewport!
    await waitFor(() =>
      expect(at().bottom).toBeCloseTo(viewport.offsetTop + viewport.height, 0)
    )
    expect(textbox.getBoundingClientRect().top).toBeCloseTo(textTop, 0)
    expect(controls(toolbar)[0]).toBe('Blocks')
    fitsItsBar(toolbar)

    await moreMenu(toolbar)
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('menu')).toBe(null))
    expect(at().bottom).toBeCloseTo(viewport.offsetTop + viewport.height, 0)

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(at().bottom).toBeLessThan(textTop + 1))
  })

  it('leaves another editor’s bar in place, and a field in the same dialog', async () => {
    onTouchScreen()
    await page.viewport(390, 700)
    render(
      <div role='dialog' aria-label='Compose'>
        <input aria-label='Subject' />
        <Editor
          aria-label={LABEL}
          defaultValue={valueIn('email')}
          toolbar='docked'
        />
        <Editor
          aria-label='Footer'
          defaultValue={valueIn('email')}
          toolbar='docked'
        />
      </div>
    )
    const [first, second] = await screen.findAllByRole('toolbar', {
      name: 'Formatting'
    })
    const viewport = window.visualViewport!
    const bottom = viewport.offsetTop + viewport.height
    const docked = (toolbar: HTMLElement) =>
      Math.abs(toolbar.getBoundingClientRect().bottom - bottom) < 1
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await userEvent.click(within(textbox).getByText(TEXT))
    await waitFor(() => expect(docked(first!)).toBe(true))

    await moreMenu(first!)
    expect(docked(second!)).toBe(false)
    await userEvent.keyboard('{Escape}')

    await userEvent.click(screen.getByRole('textbox', { name: 'Subject' }))
    await waitFor(() => expect(docked(first!)).toBe(false))
  })

  it('leaves no band stuck at the top while it’s above the keyboard', async () => {
    onTouchScreen()
    await page.viewport(390, 700)
    render(
      <>
        <Editor
          aria-label={LABEL}
          toolbar='docked'
          defaultValue={{
            version: 1,
            preset: 'email',
            doc: {
              type: 'doc',
              content: Array.from({ length: 30 }, (_, index) => ({
                type: 'paragraph',
                content: [{ type: 'text', text: `${TEXT} ${index}` }]
              }))
            }
          }}
        />
        <div style={{ blockSize: 1600 }} />
      </>
    )
    const toolbar = await shownToolbar()
    const slot = toolbar.closest<HTMLElement>('[data-slot="editor-toolbar"]')!
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await userEvent.click(within(textbox).getByText(`${TEXT} 0`))
    const viewport = window.visualViewport!
    await waitFor(() =>
      expect(toolbar.getBoundingClientRect().bottom).toBeCloseTo(
        viewport.offsetTop + viewport.height,
        0
      )
    )

    window.scrollBy(0, 400)
    onTestFinished(() => window.scrollTo(0, 0))

    await waitFor(() =>
      expect(slot.getBoundingClientRect().bottom).toBeLessThan(0)
    )
  })

  it('meets the bottom of the screen inside a container query’s box', async () => {
    onTouchScreen()
    await page.viewport(390, 700)
    render(
      <div style={{ containerType: 'inline-size', paddingTop: 200 }}>
        <Editor
          aria-label={LABEL}
          defaultValue={valueIn('email')}
          toolbar='docked'
        />
        <div style={{ blockSize: 1600 }} />
      </div>
    )
    const toolbar = await shownToolbar()
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await userEvent.click(within(textbox).getByText(TEXT))

    const viewport = window.visualViewport!
    await waitFor(() =>
      expect(toolbar.getBoundingClientRect().bottom).toBeCloseTo(
        viewport.offsetTop + viewport.height,
        0
      )
    )
  })

  it('stays docked in its own menu, and undocks once focus leaves the editor', async () => {
    onTouchScreen()
    await page.viewport(390, 700)
    render(
      <>
        <Editor
          aria-label={LABEL}
          defaultValue={valueIn('email')}
          toolbar='docked'
        />
        <button type='button'>Save</button>
      </>
    )
    const toolbar = await shownToolbar()
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    const viewport = window.visualViewport!
    const docked = () =>
      Math.abs(
        toolbar.getBoundingClientRect().bottom -
          (viewport.offsetTop + viewport.height)
      ) < 1
    await userEvent.click(within(textbox).getByText(TEXT))
    await waitFor(() => expect(docked()).toBe(true))

    await moreMenu(toolbar)
    await new Promise(requestAnimationFrame)
    await new Promise(requestAnimationFrame)
    expect(docked()).toBe(true)

    await userEvent.keyboard('{Escape}')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(docked()).toBe(false))
  })

  it('leaves out text controls while a block is selected', async () => {
    onTouchScreen()
    await page.viewport(390, 700)
    render(
      <Editor
        aria-label={LABEL}
        toolbar='docked'
        defaultValue={{
          version: 1,
          preset: 'email',
          doc: {
            type: 'doc',
            content: [
              { type: 'paragraph', content: [{ type: 'text', text: TEXT }] },
              { type: 'spacer' }
            ]
          }
        }}
      />
    )
    const toolbar = await shownToolbar()
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await userEvent.click(within(textbox).getByText(TEXT))
    await waitFor(() =>
      expect(
        controls(toolbar).some((name) => /^Block type/.test(name ?? ''))
      ).toBe(true)
    )

    await userEvent.click(textbox.querySelector('[data-type="spacer"]')!)

    await waitFor(() =>
      expect(
        controls(toolbar).some((name) => /^Block type/.test(name ?? ''))
      ).toBe(false)
    )
    expect(controls(toolbar)).toEqual(
      expect.arrayContaining(['Blocks', 'Undo'])
    )
    expect(controls(toolbar)).not.toContain('Bold')
    // Nothing in this editor holds a spacer's settings.
    expect(controls(toolbar)).not.toContain('Settings')
    if (within(toolbar).queryByRole('button', { name: 'More' })) {
      await moreMenu(toolbar)
      expect(screen.queryByRole('menuitemcheckbox', { name: 'Bold' })).toBe(
        null
      )
    }
  })

  it('scrolls the caret clear of the bar above the keyboard as you type', async () => {
    onTouchScreen()
    await page.viewport(390, 700)
    onTestFinished(() => window.scrollTo(0, 0))
    render(
      <>
        <Editor
          aria-label={LABEL}
          toolbar='docked'
          defaultValue={{
            version: 1,
            preset: 'email',
            doc: {
              type: 'doc',
              content: Array.from({ length: 30 }, (_, index) => ({
                type: 'paragraph',
                content: [{ type: 'text', text: `${TEXT} ${index}` }]
              }))
            }
          }}
        />
        <div style={{ blockSize: 1600 }} />
      </>
    )
    const toolbar = await shownToolbar()
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await userEvent.click(within(textbox).getByText(`${TEXT} 0`))
    const viewport = window.visualViewport!
    await waitFor(() =>
      expect(toolbar.getBoundingClientRect().bottom).toBeCloseTo(
        viewport.offsetTop + viewport.height,
        0
      )
    )
    const line = within(textbox).getByText(`${TEXT} 20`)
    // Under the bar, though still on screen.
    window.scrollBy(
      0,
      line.getBoundingClientRect().bottom - window.innerHeight + 8
    )

    expect(line.getBoundingClientRect().bottom).toBeGreaterThan(
      toolbar.getBoundingClientRect().top
    )
    await userEvent.keyboard('{ArrowDown}'.repeat(20) + '{End}')

    await waitFor(() =>
      expect(line.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        toolbar.getBoundingClientRect().top
      )
    )
  })

  it('stays at the top with a mouse', async () => {
    await page.viewport(390, 700)
    render(
      <Editor
        aria-label={LABEL}
        defaultValue={valueIn('blocks')}
        toolbar='docked'
      />
    )
    const toolbar = await shownToolbar()
    const textbox = await screen.findByRole('textbox', { name: LABEL })

    await userEvent.click(within(textbox).getByText(TEXT))

    expect(toolbar.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      textbox.getBoundingClientRect().top + 1
    )
  })
})

describe('Editor toolbar More', () => {
  it.each([360, 375, 390, 414, 430])(
    'keeps the bar as it is while More opens, at %ipx',
    async (width) => {
      await page.viewport(width, 800)
      render(
        <Editor
          aria-label={LABEL}
          defaultValue={valueIn('blocks')}
          toolbar='docked'
        />
      )
      const toolbar = await shownToolbar()
      const textbox = await screen.findByRole('textbox', { name: LABEL })
      await userEvent.click(within(textbox).getByText(TEXT))
      await waitFor(() => fitsItsBar(toolbar))
      const before = controls(toolbar)

      await moreMenu(toolbar)

      expect(controls(toolbar)).toEqual(before)
    }
  )
  it('fits again after the bar goes while More is open', async () => {
    await page.viewport(600, 800)
    render(
      <Editor
        aria-label={LABEL}
        defaultValue={valueIn('rich')}
        defaultToolbar='floating'
      />
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await userEvent.click(within(textbox).getByText(TEXT))
    await page.viewport(360, 800)
    const toolbar = await shownToolbar()
    await waitFor(() => fitsItsBar(toolbar))
    await moreMenu(toolbar)

    await page.viewport(800, 800)
    await waitFor(() =>
      expect(screen.queryByRole('toolbar', { name: 'Formatting' })).toBe(null)
    )
    await page.viewport(360, 800)

    const again = await shownToolbar()
    await waitFor(() => expect(rows(again)).toBe(1))
    fitsItsBar(again)
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
  it('fits a bar pinned from the floating toolbar', async () => {
    render(
      <div style={{ width: 440, paddingTop: 96 }}>
        <Editor
          aria-label={LABEL}
          defaultValue={valueIn('rich')}
          defaultToolbar='floating'
          pinnable
        />
      </div>
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await userEvent.tripleClick(within(textbox).getByText(TEXT))
    const bubble = await screen.findByRole('toolbar', {
      name: 'Selection formatting'
    })
    await userEvent.click(within(bubble).getByRole('button', { name: 'More' }))
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Pin toolbar to top' })
    )

    const toolbar = await shownToolbar()
    await waitFor(() => expect(rows(toolbar)).toBe(1))
    fitsItsBar(toolbar)
  })
})
