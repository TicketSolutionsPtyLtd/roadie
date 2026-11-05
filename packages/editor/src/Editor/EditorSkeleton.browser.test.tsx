import { render, screen } from '@testing-library/react'
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
import { page } from 'vitest/browser'

import { Editor } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import type { EditorSize, EditorToolbarMode } from './variants'

const LABEL = 'Event description'

let style: HTMLStyleElement
beforeAll(() => {
  style = document.createElement('style')
  style.textContent = roadieCss
  document.head.append(style)
})
afterAll(() => style.remove())
afterEach(() => page.viewport(1280, 800))

// The server's markup is the skeleton, as the page shows it before the editor loads.
function serverSkeleton(size: EditorSize, toolbar?: EditorToolbarMode) {
  const host = document.createElement('div')
  host.innerHTML = renderToString(
    <Editor aria-label={LABEL} size={size} toolbar={toolbar} />
  )
  document.body.append(host)
  onTestFinished(() => host.remove())
  return host.querySelector<HTMLElement>('[data-slot="skeleton"]')!
}

describe('Editor skeleton', () => {
  it.each<[number, EditorSize]>([
    [1280, 'sm'],
    [1280, 'md'],
    [1280, 'lg'],
    [390, 'sm'],
    [390, 'md'],
    [390, 'lg']
  ])(
    'holds the loaded editor’s height at %ipx wide, size %s, so the page doesn’t jump',
    async (width, size) => {
      await page.viewport(width, 800)
      const skeleton = serverSkeleton(size)
      render(<Editor aria-label={LABEL} size={size} />)
      const textbox = await screen.findByRole('textbox', { name: LABEL })
      const loaded = textbox.closest<HTMLElement>('[data-slot="editor"]')!

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

describe('Floating editor skeleton', () => {
  it.each<[number, EditorSize]>([
    [1280, 'sm'],
    [1280, 'lg'],
    [390, 'sm'],
    [390, 'lg']
  ])(
    'holds the loaded editor’s height at %ipx wide, size %s, with room for a bar only where it docks',
    async (width, size) => {
      await page.viewport(width, 800)
      const skeleton = serverSkeleton(size, 'floating')
      const docked = serverSkeleton(size, 'docked')
      render(<Editor aria-label={LABEL} size={size} toolbar='floating' />)
      const textbox = await screen.findByRole('textbox', { name: LABEL })
      const loaded = textbox.closest<HTMLElement>('[data-slot="editor"]')!
      const height = (element: HTMLElement) =>
        element.getBoundingClientRect().height

      expect(Math.abs(height(skeleton) - height(loaded))).toBeLessThanOrEqual(1)
      if (width < 640) expect(height(skeleton)).toBe(height(docked))
      else expect(height(skeleton)).toBeLessThan(height(docked))
    }
  )
})
