import { render, screen, waitFor } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
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

import { Field } from '@oztix/roadie-components/field'

import { Editor } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import type { EditorValue } from '../schema'
import type { EditorEmphasis, EditorSize } from './variants'

const LABEL = 'Event description'
const TRANSPARENT = 'rgba(0, 0, 0, 0)'
// Spacing step 3, between a subtler editor's toolbar and its first line.
const SUBTLER_GAP = 12

const description: EditorValue = {
  version: 1,
  preset: 'basic',
  doc: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Doors 7pm at the Kazoo Hollow Room' }]
      }
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
afterEach(() => page.viewport(1280, 800))

const frameOf = (textbox: HTMLElement) =>
  textbox.closest<HTMLElement>('[data-slot="editor"]')!

async function loadedTextbox() {
  return screen.findByRole('textbox', { name: LABEL })
}

function frameLook(textbox: HTMLElement) {
  const frame = getComputedStyle(frameOf(textbox))
  return {
    border: frame.borderTopWidth,
    filled: frame.backgroundColor !== TRANSPARENT,
    contentInset:
      textbox.getBoundingClientRect().left -
      frameOf(textbox).getBoundingClientRect().left
  }
}

function ringWidth(element: HTMLElement) {
  const { outlineStyle, outlineWidth } = getComputedStyle(element)
  return outlineStyle === 'none' ? 0 : parseFloat(outlineWidth)
}

function textStart(textbox: HTMLElement) {
  const box = getComputedStyle(textbox)
  return (
    textbox.getBoundingClientRect().left +
    parseFloat(box.borderInlineStartWidth) +
    parseFloat(box.paddingInlineStart)
  )
}

describe('Editor emphasis', () => {
  it.each<[EditorEmphasis, ReturnType<typeof frameLook>]>([
    ['normal', { border: '1px', filled: true, contentInset: 1 }],
    ['subtle', { border: '1px', filled: true, contentInset: 1 }]
  ])(
    'keeps the %s field’s box, with a ring while focused',
    async (emphasis, look) => {
      render(<Editor aria-label={LABEL} emphasis={emphasis} />)
      const textbox = await loadedTextbox()

      expect(frameLook(textbox)).toEqual(look)
      expect(getComputedStyle(textbox).paddingInlineStart).toBe('12px')

      await userEvent.click(textbox)
      await waitFor(() =>
        expect(ringWidth(frameOf(textbox))).toBeGreaterThan(0)
      )
    }
  )

  it('shows subtler content on the page, with no box', async () => {
    render(
      <Editor
        aria-label={LABEL}
        emphasis='subtler'
        placeholder='Tell people about the night'
      />
    )
    const textbox = await loadedTextbox()
    const frame = frameOf(textbox)

    expect(getComputedStyle(frame).borderTopWidth).toBe('0px')
    expect(getComputedStyle(frame).borderInlineStartWidth).toBe('0px')
    expect(getComputedStyle(frame).backgroundColor).toBe(TRANSPARENT)
    expect(
      Math.abs(textStart(textbox) - frame.getBoundingClientRect().left)
    ).toBeLessThanOrEqual(1)
    const firstLine = textbox.firstElementChild!.getBoundingClientRect()
    expect(
      Math.abs(firstLine.top - textbox.getBoundingClientRect().top)
    ).toBeLessThanOrEqual(1)
  })

  it.each(['normal', 'floating'] as const)(
    'lines a subtler editor’s %s toolbar up with its text, a step clear of it',
    async (toolbarEmphasis) => {
      render(
        <Editor
          aria-label={LABEL}
          emphasis='subtler'
          defaultValue={description}
        >
          <Editor.Toolbar emphasis={toolbarEmphasis} />
          <Editor.Content />
        </Editor>
      )
      const textbox = await loadedTextbox()
      const surface = screen
        .getByLabelText('Formatting')
        .closest<HTMLElement>('[data-slot="toolbar-surface"]')!
      const bar = surface.getBoundingClientRect()
      const firstLine = textbox.firstElementChild!.getBoundingClientRect()

      expect(Math.abs(bar.left - textStart(textbox))).toBeLessThanOrEqual(1)
      expect(firstLine.top - bar.bottom).toBeGreaterThanOrEqual(SUBTLER_GAP)
    }
  )

  it('shows focus in a subtler editor by the caret, not a ring', async () => {
    render(<Editor aria-label={LABEL} emphasis='subtler' />)
    const textbox = await loadedTextbox()
    const frame = frameOf(textbox)

    await userEvent.click(textbox)
    await waitFor(() => expect(textbox).toHaveFocus())

    const focused = getComputedStyle(frame)
    expect(ringWidth(frame)).toBe(0)
    expect(focused.borderTopWidth).toBe('0px')
    expect(focused.backgroundColor).toBe(TRANSPARENT)
    expect(ringWidth(textbox)).toBe(0)
  })

  it('marks an invalid subtler editor with a danger bar outside its text', async () => {
    render(
      <Field invalid>
        <Field.Label>{LABEL}</Field.Label>
        <Editor emphasis='subtler' defaultValue={description} />
        <Field.ErrorText>Add a description</Field.ErrorText>
      </Field>
    )
    const textbox = await loadedTextbox()
    const frame = frameOf(textbox)
    const danger = document.createElement('div')
    danger.style.color = 'var(--color-danger-9)'
    document.body.append(danger)
    onTestFinished(() => danger.remove())

    const bar = getComputedStyle(textbox)
    expect(parseFloat(bar.borderInlineStartWidth)).toBeGreaterThanOrEqual(2)
    expect(bar.borderInlineStartColor).toBe(getComputedStyle(danger).color)
    expect(textbox.getBoundingClientRect().left).toBeLessThan(
      frame.getBoundingClientRect().left
    )
    expect(
      Math.abs(textStart(textbox) - frame.getBoundingClientRect().left)
    ).toBeLessThanOrEqual(1)
  })

  it('dims a disabled subtler editor as a disabled field does', async () => {
    render(<Editor aria-label={LABEL} emphasis='subtler' disabled />)
    const frame = frameOf(await loadedTextbox())

    expect(getComputedStyle(frame).opacity).toBe('0.5')
    expect(getComputedStyle(frame).pointerEvents).toBe('none')
  })
})

function serverSkeleton(size: EditorSize) {
  const host = document.createElement('div')
  host.innerHTML = renderToString(
    <Editor aria-label={LABEL} size={size} emphasis='subtler' />
  )
  document.body.append(host)
  onTestFinished(() => host.remove())
  return host.firstElementChild as HTMLElement
}

describe('Subtler editor skeleton', () => {
  it.each<[number, EditorSize]>([
    [1280, 'sm'],
    [1280, 'md'],
    [1280, 'lg'],
    [390, 'sm'],
    [390, 'md'],
    [390, 'lg']
  ])(
    'draws no box and holds the loaded height at %ipx wide, size %s',
    async (width, size) => {
      await page.viewport(width, 800)
      const skeleton = serverSkeleton(size)
      render(<Editor aria-label={LABEL} size={size} emphasis='subtler' />)
      const loaded = frameOf(await loadedTextbox())

      expect(getComputedStyle(skeleton).backgroundColor).toBe(TRANSPARENT)
      expect(skeleton.getBoundingClientRect().width).toBeGreaterThan(0)
      expect(
        Math.abs(
          skeleton.getBoundingClientRect().height -
            loaded.getBoundingClientRect().height
        )
      ).toBeLessThanOrEqual(1)
    }
  )
})
