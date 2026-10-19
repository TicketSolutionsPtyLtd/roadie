import { render, screen, waitFor, within } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  onTestFinished
} from 'vitest'
import { page, userEvent } from 'vitest/browser'

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
  toolbar.closest<HTMLElement>('[data-slot="toolbar-surface"]')!
const frameOf = (element: HTMLElement) =>
  element.closest<HTMLElement>('[data-slot="editor"]')!
const surfaceOf = barOf
const TRANSPARENT = 'rgba(0, 0, 0, 0)'

const lastLine = (textbox: HTMLElement) => textbox.lastElementChild!

function expectBordered(surface: HTMLElement) {
  const { borderTopWidth, borderTopColor, backgroundColor } =
    getComputedStyle(surface)
  expect(borderTopWidth).toBe('1px')
  expect(borderTopColor).not.toBe(TRANSPARENT)
  expect(backgroundColor).not.toBe(TRANSPARENT)
}

const TOOLBAR_EMPHASES = [
  'normal',
  'subtle',
  'subtler',
  'raised',
  'floating'
] as const

// A size-sm control, the bar's padding, and its border.
const DEFAULT_BAR_HEIGHT = 32 + 2 * 4 + 2

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

// In the page, not the viewport, as clicking the text can scroll it.
const pageTop = (element: HTMLElement) =>
  element.getBoundingClientRect().top + window.scrollY

function looksOf(surface: HTMLElement) {
  const { width, height } = surface.getBoundingClientRect()
  const { boxShadow, backgroundColor, borderTopColor, borderTopWidth } =
    getComputedStyle(surface)
  return {
    width,
    height,
    boxShadow,
    backgroundColor,
    borderTopColor,
    borderTopWidth
  }
}

describe.each(SCREENS)('Editor toolbar on %s', (_, size, touch) => {
  it('sits in flow at the top, the same focused or not, and scrolls away with the text', async () => {
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
    const surface = surfaceOf(toolbar)
    const resting = {
      looks: looksOf(surface),
      top: pageTop(toolbar),
      text: pageTop(textbox)
    }

    expect(getComputedStyle(bar).position).not.toMatch(/sticky|fixed/)
    expect(surface).toHaveClass('emphasis-normal')
    expectBordered(surface)
    expect(toolbar.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      textbox.getBoundingClientRect().top + 1
    )

    await focusedTextbox()
    await new Promise(requestAnimationFrame)

    expect(getComputedStyle(bar).position).not.toMatch(/sticky|fixed/)
    expect(looksOf(surface)).toEqual(resting.looks)
    expect(pageTop(toolbar)).toBe(resting.top)
    expect(pageTop(textbox)).toBe(resting.text)

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await new Promise(requestAnimationFrame)

    expect(looksOf(surface)).toEqual(resting.looks)
    expect(pageTop(textbox)).toBe(resting.text)

    await focusedTextbox()
    window.scrollTo(0, resting.top + 300)

    await waitFor(() =>
      expect(toolbar.getBoundingClientRect().bottom).toBeLessThan(0)
    )
  })

  it.each(TOOLBAR_EMPHASES)(
    'takes the %s emphasis, the same focused or not',
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

      if (emphasis === 'subtler')
        expect(surface.className).not.toMatch(/emphasis-/)
      else expect(surface).toHaveClass(`emphasis-${emphasis}`)
      if (emphasis === 'raised' || emphasis === 'floating')
        expect(surface).toHaveClass('is-translucent')
      expect(resting.height).toBe(DEFAULT_BAR_HEIGHT)

      await focusedTextbox()
      await new Promise(requestAnimationFrame)

      expect(looksOf(surface)).toEqual(resting)
    }
  )
})

describe('Editor toolbar on a phone', () => {
  it.each(['normal', 'subtle', 'subtler'] as const)(
    'keeps a scrolling toolbar inside a %s editor’s frame, inset as on a larger screen',
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
      const inset = emphasis === 'subtler' ? 0 : 8

      expect(bar.left - frame.left).toBeGreaterThanOrEqual(inset)
      expect(frame.right - bar.right).toBeGreaterThanOrEqual(inset)
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
  it('hugs its controls, a size smaller than the editor', async () => {
    render(<Editor aria-label={LABEL} />)
    const textbox = await focusedTextbox()
    const toolbar = await shownToolbar()
    const frame = frameOf(textbox)

    expect(surfaceOf(toolbar).getBoundingClientRect().width).toBeLessThan(
      frame.getBoundingClientRect().width / 2
    )
    expect(
      within(toolbar)
        .getByRole('button', { name: 'Bold' })
        .getBoundingClientRect().height
    ).toBe(32)
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
