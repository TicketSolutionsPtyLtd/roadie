import { cleanup, render, screen } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  onTestFinished
} from 'vitest'
import { userEvent, page as viewport } from 'vitest/browser'

import { Editor } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import type { EditorValue, JSONContent } from '../schema'

const LABEL = 'Newsletter'

const p = (text: string): JSONContent => ({
  type: 'paragraph',
  content: [{ type: 'text', text }]
})

const value: EditorValue = {
  version: 1,
  preset: 'email',
  doc: {
    type: 'doc',
    content: [
      p('Hi there'),
      {
        type: 'section',
        content: [
          {
            type: 'columns',
            content: [
              { type: 'column', content: [p('Velvet Kookaburra')] },
              { type: 'column', content: [p('Marri Lane')] }
            ]
          }
        ]
      },
      { type: 'section', content: [p('Bringing a friend?')] }
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
afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

function textLeft(element: Element) {
  const range = element.ownerDocument.createRange()
  range.selectNodeContents(element)
  return range.getBoundingClientRect().left
}

// The editor fills a screen this wide, as on a phone or a desktop.
async function renderCanvas(width: number) {
  await viewport.viewport(width, 800)
  onTestFinished(() => viewport.viewport(1280, 800))
  render(<Editor aria-label={LABEL} defaultValue={value} />)
  await screen.findByText('Marri Lane')
  const canvas = screen.getByRole('textbox', { name: LABEL })
  const line = (text: string) => screen.getByText(text).closest('p')!
  return { canvas, line }
}

describe('Editor email alignment', () => {
  it.each([375, 1280])(
    'lines text in columns up with the text around them at %ipx',
    async (width) => {
      const { line } = await renderCanvas(width)
      const body = textLeft(line('Hi there'))

      expect(textLeft(line('Velvet Kookaburra'))).toBeCloseTo(body, 0)
      expect(textLeft(line('Bringing a friend?'))).toBeCloseTo(body, 0)
    }
  )

  it.each([375, 1280])(
    'keeps the canvas inside the screen at %ipx',
    async (width) => {
      const { canvas, line } = await renderCanvas(width)

      expect(document.scrollingElement!.scrollWidth).toBeLessThanOrEqual(width)
      expect(canvas.scrollWidth).toBeLessThanOrEqual(canvas.clientWidth)
      for (const text of ['Hi there', 'Marri Lane', 'Bringing a friend?']) {
        expect(line(text).getBoundingClientRect().right).toBeLessThanOrEqual(
          canvas.getBoundingClientRect().right
        )
      }
    }
  )

  // The canvas is as wide as the screen the email reaches, and MJML puts
  // columns side by side from a 480px screen.
  it.each([
    [470, 'stacks'],
    [520, 'sets side by side']
  ])('at %ipx, %s columns as the email does', async (width) => {
    const { canvas, line } = await renderCanvas(width)
    const canvasWidth = canvas.getBoundingClientRect().width
    const sideBySide =
      line('Velvet Kookaburra').getBoundingClientRect().top ===
      line('Marri Lane').getBoundingClientRect().top

    expect(sideBySide).toBe(canvasWidth >= 480)
  })

  it.each([375, 1280])(
    'lines a column’s outline up with its section’s at %ipx',
    async (width) => {
      const { line } = await renderCanvas(width)
      const columns = [
        ...line('Velvet Kookaburra')
          .closest('[data-type="columns"]')!
          .querySelectorAll<HTMLElement>(':scope > [data-type="column"]')
      ]
      const section = columns[0]!.closest<HTMLElement>('[data-type="section"]')!
      const outline = (element: HTMLElement) => {
        const box = element.getBoundingClientRect()
        const offset = parseFloat(getComputedStyle(element).outlineOffset)
        return { left: box.left - offset, right: box.right + offset }
      }

      expect(outline(columns[0]!).left).toBeCloseTo(outline(section).left, 0)
      expect(outline(columns.at(-1)!).right).toBeCloseTo(
        outline(section).right,
        0
      )
      expect(
        textLeft(line('Velvet Kookaburra')) - outline(columns[0]!).left
      ).toBeCloseTo(
        textLeft(line('Bringing a friend?')) - outline(section).left,
        0
      )
    }
  )

  it.each([375, 1280])(
    'puts a first column block’s grip where a body block’s goes, at %ipx',
    async (width) => {
      const { canvas, line } = await renderCanvas(width)
      const gripBeside = async (text: string) => {
        await userEvent.hover(line(text))
        const grip = await screen.findByRole('button', {
          name: 'Block actions'
        })
        await expect
          .poll(() => grip.getBoundingClientRect().top)
          .toBeGreaterThanOrEqual(line(text).getBoundingClientRect().top - 12)
        return grip.getBoundingClientRect()
      }

      const body = await gripBeside('Hi there')
      const inColumn = await gripBeside('Velvet Kookaburra')

      expect(inColumn.left).toBeCloseTo(body.left, 0)
      expect(inColumn.right).toBeLessThanOrEqual(
        textLeft(line('Velvet Kookaburra'))
      )
      // On a phone the grip sits in the email's own padding.
      if (width < 544) {
        expect(inColumn.left).toBeGreaterThanOrEqual(
          canvas.getBoundingClientRect().left - 2
        )
      }
    }
  )
})
