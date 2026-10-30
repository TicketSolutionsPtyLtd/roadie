import { render, screen, waitFor } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import { Field } from '@oztix/roadie-components/field'

import { Editor } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import type { EditorValue } from '../schema'

const WIDE = '/src/Editor/fixtures/wide.svg'
const LABEL = 'Event description'

const pictured: EditorValue = {
  version: 1,
  preset: 'rich',
  doc: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Show your ticket on your phone at the Kazoo Hollow Room door.'
          }
        ]
      },
      { type: 'image', attrs: { src: WIDE, alt: 'The door' } }
    ]
  }
}

let style: HTMLStyleElement
beforeAll(async () => {
  style = document.createElement('style')
  style.textContent = roadieCss
  document.head.append(style)
  await page.viewport(390, 700)
})
afterAll(async () => {
  style.remove()
  await page.viewport(1280, 800)
})
afterEach(() => {
  document.body.innerHTML = ''
})

describe('Editor width', () => {
  const longLine: EditorValue = {
    version: 1,
    preset: 'rich',
    doc: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Ochre Kite Weekender '.repeat(30) }]
        }
      ]
    }
  }

  it.each(['normal', 'subtle', 'raised'] as const)(
    'runs a %s editor’s text the full width of its box',
    async (emphasis) => {
      render(
        <div style={{ width: 1200 }}>
          <Editor
            aria-label={LABEL}
            emphasis={emphasis}
            defaultValue={longLine}
          />
        </div>
      )
      const textbox = await screen.findByRole('textbox', { name: LABEL })
      const line = await waitFor(() => textbox.querySelector('p')!)
      const box = getComputedStyle(textbox)
      const inner =
        textbox.clientWidth -
        parseFloat(box.paddingInlineStart) -
        parseFloat(box.paddingInlineEnd)

      expect(line.getBoundingClientRect().width).toBeCloseTo(inner, 0)
    }
  )

  it('keeps a subtler editor’s text to the measure the page reads at', async () => {
    render(
      <div style={{ width: 1200 }}>
        <Editor aria-label={LABEL} emphasis='subtler' defaultValue={longLine} />
      </div>
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    const line = await waitFor(() => textbox.querySelector('p')!)

    expect(line.getBoundingClientRect().width).toBeLessThan(
      textbox.clientWidth - 100
    )
  })

  it('stays inside its Field when an image is wider than the screen', async () => {
    render(
      <div style={{ width: 320 }}>
        <Field>
          <Field.Label>{LABEL}</Field.Label>
          <Editor preset='rich' defaultValue={pictured} />
        </Field>
      </div>
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    const image = await screen.findByRole('img', { name: 'The door' })
    await waitFor(() =>
      expect((image as HTMLImageElement).naturalWidth).toBe(1600)
    )
    const frame = textbox.closest<HTMLElement>('[data-slot="editor"]')!

    expect(frame.getBoundingClientRect().width).toBeLessThanOrEqual(320)
    expect(image.getBoundingClientRect().right).toBeLessThanOrEqual(
      frame.getBoundingClientRect().right
    )
  })
})
