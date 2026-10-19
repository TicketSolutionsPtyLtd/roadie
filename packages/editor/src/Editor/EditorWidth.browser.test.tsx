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
  await page.viewport(1280, 720)
})
afterEach(() => {
  document.body.innerHTML = ''
})

describe('Editor width', () => {
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
