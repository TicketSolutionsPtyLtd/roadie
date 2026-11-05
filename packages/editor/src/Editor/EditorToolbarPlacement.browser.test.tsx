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

import { Pane } from '@oztix/roadie-components/pane'

import { Editor } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import type { EditorValue } from '../schema'

const LABEL = 'Event description'
const PHONE = { width: 390, height: 700 }
const DESKTOP = { width: 1280, height: 800 }

const longRead: EditorValue = {
  version: 1,
  preset: 'rich',
  doc: {
    type: 'doc',
    content: Array.from({ length: 40 }, (_, index) => ({
      type: 'paragraph',
      content: [
        { type: 'text', text: `Set ${index + 1} at the Kazoo Hollow Room` }
      ]
    }))
  }
}

const shortRead: EditorValue = {
  version: 1,
  preset: 'rich',
  doc: {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Doors 7pm' }] }
    ]
  }
}

let style: HTMLStyleElement
beforeAll(() => {
  style = document.createElement('style')
  style.textContent = roadieCss
  document.head.append(style)
})
afterAll(() => style.remove())
afterEach(async () => {
  await page.viewport(DESKTOP.width, DESKTOP.height)
  window.scrollTo(0, 0)
})

const PLACEHOLDER = 'Tell people about the night'

const barOf = (toolbar: HTMLElement) =>
  toolbar.closest<HTMLElement>('[data-slot="editor-toolbar"]')!
const frameOf = (element: HTMLElement) =>
  element.closest<HTMLElement>('[data-slot="editor"]')!
const surfaceOf = (toolbar: HTMLElement) =>
  toolbar.closest<HTMLElement>('[data-slot="toolbar-surface"]')!
const TRANSPARENT = 'rgba(0, 0, 0, 0)'

const lastLine = (textbox: HTMLElement) => textbox.lastElementChild!

const TOOLBAR_EMPHASES = [
  'normal',
  'subtle',
  'subtler',
  'raised',
  'floating'
] as const

// A size-sm control, with no inset or border around it.
const CONTROL_HEIGHT = 32

function placeholderOffset(textbox: HTMLElement) {
  const empty = textbox.querySelector<HTMLElement>('.is-editor-empty')!
  expect(empty).toHaveAttribute('data-placeholder', PLACEHOLDER)
  const content = textbox.closest<HTMLElement>('[data-slot="editor-content"]')!
  return empty.getBoundingClientRect().top - content.getBoundingClientRect().top
}

const COARSE = '(pointer: coarse)'

// Playwright can't emulate a touch screen's pointer, so its media rules are
// pinned to match, as one would decide them.
function pinCoarsePointer() {
  const rules: CSSMediaRule[] = []
  const collect = (list: CSSRuleList) => {
    for (const rule of Array.from(list)) {
      if (rule instanceof CSSMediaRule && rule.conditionText.includes(COARSE))
        rules.push(rule)
      if (rule instanceof CSSGroupingRule) collect(rule.cssRules)
    }
  }
  collect(style.sheet!.cssRules)
  const pinned = rules.map((rule) => [rule, rule.media.mediaText] as const)
  for (const [rule, query] of pinned)
    rule.media.mediaText = query.replace(COARSE, 'all')
  onTestFinished(() => {
    for (const [rule, query] of pinned) rule.media.mediaText = query
  })
}

async function focusedTextbox() {
  const textbox = await screen.findByRole('textbox', { name: LABEL })
  await userEvent.click(textbox)
  await waitFor(() => expect(textbox).toHaveFocus())
  return textbox
}

function scrollerOf(element: HTMLElement) {
  let ancestor = element.parentElement
  while (ancestor && getComputedStyle(ancestor).overflowX !== 'scroll') {
    ancestor = ancestor.parentElement
  }
  return ancestor!
}

async function shownToolbar() {
  const toolbar = await screen.findByRole('toolbar', { name: 'Formatting' })
  await waitFor(() => expect(toolbar).toBeVisible())
  return toolbar
}

const SCREENS = [
  ['a phone with a touch screen', PHONE, true],
  ['a larger screen', DESKTOP, false]
] as const

async function onScreen(
  size: { width: number; height: number },
  touch: boolean
) {
  await page.viewport(size.width, size.height)
  if (touch) pinCoarsePointer()
}

// In the page, not the viewport, as clicking the text can scroll it. Firefox
// gives a scrolled box's top off by a few millionths of a pixel.
const pageTop = (element: HTMLElement) =>
  element.getBoundingClientRect().top + window.scrollY

function looksOf(surface: HTMLElement) {
  const { width, height } = surface.getBoundingClientRect()
  const { boxShadow, backgroundColor, borderTopWidth } =
    getComputedStyle(surface)
  return { width, height, boxShadow, backgroundColor, borderTopWidth }
}

describe.each(SCREENS)('Editor toolbar on %s', (_, size, touch) => {
  it('runs flat across the top edge, the same focused or not', async () => {
    await onScreen(size, touch)
    render(
      <>
        <button type='button'>Save</button>
        <Editor aria-label={LABEL} defaultValue={longRead} />
      </>
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    const toolbar = await shownToolbar()
    const bar = barOf(toolbar)
    const frame = frameOf(textbox)
    const resting = {
      looks: looksOf(bar),
      top: pageTop(toolbar),
      text: pageTop(textbox)
    }
    const { borderBottomWidth, borderBottomColor } = getComputedStyle(bar)

    // Rounded as the frame is, and clipping the toolbar's fill to it.
    expect(getComputedStyle(bar).borderTopLeftRadius).toBe(
      getComputedStyle(frame).borderTopLeftRadius
    )
    expect(getComputedStyle(bar).overflowX).toBe('clip')
    expect(borderBottomWidth).toBe('1px')
    expect(borderBottomColor).not.toBe(TRANSPARENT)
    const fill = (element: HTMLElement) =>
      getComputedStyle(element).backgroundColor
    expect(fill(bar)).not.toBe(TRANSPARENT)
    expect(fill(bar)).toBe(fill(frame))
    expect(bar.getBoundingClientRect().width).toBe(frame.clientWidth)
    expect(bar.getBoundingClientRect().top).toBe(
      frame.getBoundingClientRect().top + frame.clientTop
    )
    expect(toolbar.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      textbox.getBoundingClientRect().top + 1
    )

    await focusedTextbox()
    // Clicking the text can scroll the page, which a sticky bar follows.
    window.scrollTo(0, 0)
    await new Promise(requestAnimationFrame)

    const { width, height, boxShadow, borderTopWidth } = resting.looks
    const shape = { width, height, boxShadow, borderTopWidth }
    expect(looksOf(bar)).toMatchObject(shape)
    // The focused frame's fill changes, and the bar follows it.
    await waitFor(() => expect(fill(bar)).toBe(fill(frame)))
    expect(pageTop(toolbar)).toBeCloseTo(resting.top, 1)
    expect(pageTop(textbox)).toBeCloseTo(resting.text, 1)

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await new Promise(requestAnimationFrame)

    expect(looksOf(bar)).toMatchObject(shape)
    await waitFor(() => expect(fill(bar)).toBe(fill(frame)))
    expect(pageTop(textbox)).toBeCloseTo(resting.text, 1)
  })

  it('sticks to the top of the page while the text scrolls under it, then leaves with the editor', async () => {
    await onScreen(size, touch)
    render(
      <>
        <Editor aria-label={LABEL} defaultValue={longRead} />
        <div style={{ height: 2000 }} />
      </>
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    const toolbar = barOf(await shownToolbar())
    const start = pageTop(toolbar)

    window.scrollTo(0, start + 300)
    await waitFor(() =>
      expect(Math.abs(toolbar.getBoundingClientRect().top)).toBeLessThan(1)
    )
    expect(lastLine(textbox).getBoundingClientRect().top).toBeGreaterThan(0)

    window.scrollTo(
      0,
      pageTop(frameOf(textbox)) + frameOf(textbox).offsetHeight + 100
    )
    await waitFor(() =>
      expect(toolbar.getBoundingClientRect().bottom).toBeLessThan(0)
    )
  })

  it.each(TOOLBAR_EMPHASES)(
    'takes the %s emphasis as its fill, the same focused or not',
    async (emphasis) => {
      await onScreen(size, touch)
      render(
        <Editor aria-label={LABEL} defaultValue={shortRead}>
          <Editor.Toolbar emphasis={emphasis} />
          <Editor.Content />
        </Editor>
      )
      const surface = surfaceOf(await shownToolbar())
      const resting = looksOf(surface)

      // A control, with the bar's padding above and below it.
      expect(resting.height).toBe(CONTROL_HEIGHT + 8)
      expect(resting.borderTopWidth).toBe('0px')
      expect(resting.boxShadow).toBe('none')
      if (emphasis === 'subtler')
        expect(resting.backgroundColor).toBe(TRANSPARENT)
      else expect(resting.backgroundColor).not.toBe(TRANSPARENT)

      await focusedTextbox()
      await new Promise(requestAnimationFrame)

      expect(looksOf(surface)).toEqual(resting)
    }
  )
})

describe('Editor toolbar in a scroll container', () => {
  it('sticks to the container’s top while the editor scrolls inside it', async () => {
    render(
      <div data-testid='scroller' style={{ height: 300, overflowY: 'auto' }}>
        <p style={{ height: 120 }}>Ochre Kite Weekender</p>
        <Editor aria-label={LABEL} defaultValue={longRead} />
      </div>
    )
    const scroller = screen.getByTestId('scroller')
    const toolbar = barOf(await shownToolbar())

    scroller.scrollTop = 600
    await waitFor(() =>
      expect(
        Math.abs(
          toolbar.getBoundingClientRect().top -
            scroller.getBoundingClientRect().top
        )
      ).toBeLessThan(1)
    )
  })
})

describe('Editor toolbar in a pane', () => {
  it('sticks under the pane’s header, not behind it', async () => {
    render(
      <div style={{ height: 500, display: 'grid' }}>
        <Pane className='h-full'>
          <Pane.Header>
            <Pane.Title>Ochre Kite Weekender</Pane.Title>
          </Pane.Header>
          <Pane.Body>
            <Editor aria-label={LABEL} defaultValue={longRead} />
          </Pane.Body>
        </Pane>
      </div>
    )
    const toolbar = barOf(await shownToolbar())
    const header = document.querySelector<HTMLElement>(
      '[data-slot="pane-header"]'
    )!
    const viewport = document.querySelector<HTMLElement>(
      '[data-slot="pane-viewport"]'
    )!

    viewport.scrollTop = 600
    await waitFor(() =>
      expect(
        Math.abs(
          toolbar.getBoundingClientRect().top -
            header.getBoundingClientRect().bottom
        )
      ).toBeLessThan(1)
    )
  })
})

describe('Editor toolbar on a phone', () => {
  it.each(['normal', 'subtle', 'subtler'] as const)(
    'keeps a scrolling toolbar inside a %s editor’s frame, edge to edge',
    async (emphasis) => {
      await page.viewport(PHONE.width, PHONE.height)
      render(
        <Editor
          aria-label={LABEL}
          emphasis={emphasis}
          defaultValue={shortRead}
        />
      )
      const textbox = await focusedTextbox()
      const bar = barOf(await shownToolbar()).getBoundingClientRect()
      const frame = frameOf(textbox).getBoundingClientRect()

      expect(bar.left).toBeGreaterThanOrEqual(frame.left)
      expect(bar.right).toBeLessThanOrEqual(frame.right)
      expect(frame.right - bar.right).toBeLessThanOrEqual(1)
    }
  )

  it('scrolls its controls sideways on one row, bringing a focused one into view', async () => {
    await page.viewport(PHONE.width, PHONE.height)
    render(<Editor aria-label={LABEL} defaultValue={shortRead} />)
    const textbox = await focusedTextbox()
    const toolbar = await shownToolbar()
    const scroller = scrollerOf(toolbar)
    const controls = Array.from(toolbar.querySelectorAll('button'))

    expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth)
    expect(
      new Set(controls.map((control) => control.getBoundingClientRect().top))
        .size
    ).toBe(1)

    await userEvent.keyboard('{Alt>}{F10}{/Alt}')
    await userEvent.keyboard('{ArrowLeft}')
    const redo = screen.getByRole('button', { name: 'Redo' })
    expect(redo).toHaveFocus()
    await waitFor(() =>
      expect(redo.getBoundingClientRect().right).toBeLessThanOrEqual(
        scroller.getBoundingClientRect().right + 1
      )
    )
    expect(scroller.scrollLeft).toBeGreaterThan(0)

    await userEvent.keyboard('{Escape}')
    expect(textbox).toHaveFocus()
  })
})

describe('Editor toolbar on a larger screen', () => {
  it('holds its controls a size smaller than the editor, clear of the text', async () => {
    render(<Editor aria-label={LABEL} />)
    const textbox = await focusedTextbox()
    const toolbar = await shownToolbar()

    expect(
      within(toolbar)
        .getByRole('button', { name: 'Bold' })
        .getBoundingClientRect().height
    ).toBe(CONTROL_HEIGHT)
    expect(toolbar.getBoundingClientRect().bottom + 12).toBeLessThanOrEqual(
      lastLine(textbox).getBoundingClientRect().top
    )
  })

  it('applies a control pressed before the text has focus, focusing the text', async () => {
    render(<Editor aria-label={LABEL} defaultValue={shortRead} />)
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    const bold = screen.getByRole('button', { name: 'Bold' })

    await userEvent.click(bold)

    await waitFor(() => expect(textbox).toHaveFocus())
    expect(bold).toHaveAttribute('aria-pressed', 'true')
  })

  it('puts focus back in the text after a choice from the Block type menu', async () => {
    render(<Editor aria-label={LABEL} defaultValue={shortRead} />)
    const textbox = await focusedTextbox()

    for (const name of ['Heading 2', 'Paragraph']) {
      await userEvent.click(screen.getByRole('button', { name: /^Block type/ }))
      await userEvent.click(await screen.findByRole('menuitemradio', { name }))
      await waitFor(() => expect(textbox).toHaveFocus())
    }

    expect(
      screen.getByRole('button', { name: /^Block type/ })
    ).toHaveAccessibleName('Block type: Paragraph')
  })

  it('keeps the caret in the text when pressed between controls', async () => {
    render(<Editor aria-label={LABEL} defaultValue={shortRead} />)
    const textbox = await focusedTextbox()
    const toolbar = await shownToolbar()

    const [separator] = within(toolbar).getAllByRole('separator')
    await userEvent.click(separator!)

    expect(textbox).toHaveFocus()
  })

  it('calls its own onMouseDown and still keeps the caret in the text', async () => {
    const onMouseDown = vi.fn()
    render(
      <Editor aria-label={LABEL} defaultValue={shortRead}>
        <Editor.Toolbar onMouseDown={onMouseDown} />
        <Editor.Content />
      </Editor>
    )
    const textbox = await focusedTextbox()
    const toolbar = await shownToolbar()

    const [separator] = within(toolbar).getAllByRole('separator')
    await userEvent.click(separator!)

    expect(onMouseDown).toHaveBeenCalledOnce()
    expect(textbox).toHaveFocus()
  })
})

describe('Editor placeholder', () => {
  it.each([
    ['a larger screen', DESKTOP],
    ['a phone', PHONE]
  ])('sits at the top of the text on %s, editing or not', async (_, size) => {
    await page.viewport(size.width, size.height)
    render(<Editor aria-label={LABEL} placeholder={PLACEHOLDER} />)
    const textbox = await screen.findByRole('textbox', { name: LABEL })

    expect(placeholderOffset(textbox)).toBeLessThan(24)

    await focusedTextbox()
    await shownToolbar()

    expect(placeholderOffset(textbox)).toBeLessThan(24)
  })
})

describe('Block type trigger', () => {
  const blockType = () => screen.getByRole('button', { name: /^Block type/ })
  const choose = async (name: string) => {
    await userEvent.click(blockType())
    await userEvent.click(await screen.findByRole('menuitemradio', { name }))
    await waitFor(() => expect(screen.queryByRole('menu')).toBe(null))
  }
  const gapToCaret = () => {
    const text = [...blockType().childNodes].find(
      (node) => node.nodeType === Node.TEXT_NODE
    )!
    const range = document.createRange()
    range.selectNodeContents(text)
    const caret = blockType().querySelector('svg')!.getBoundingClientRect()
    return caret.left - range.getBoundingClientRect().right
  }

  it('fits the label it shows', async () => {
    render(<Editor aria-label={LABEL} defaultValue={shortRead} />)
    await userEvent.click(await screen.findByText('Doors 7pm'))

    await choose('Quote')
    const quoteWidth = blockType().getBoundingClientRect().width
    const quoteGap = gapToCaret()
    await choose('Paragraph')

    expect(quoteWidth).toBeLessThan(blockType().getBoundingClientRect().width)
    // The caret follows the label, not the far edge of a fixed-width button.
    expect(quoteGap).toBeLessThan(12)
  })
})
