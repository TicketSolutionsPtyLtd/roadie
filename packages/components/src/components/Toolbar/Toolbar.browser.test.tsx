import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { Toolbar } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { Button } from '../Button'
import { useStylesheet } from '../Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const ACTIONS = [
  'Bold',
  'Italic',
  'Underline',
  'Align left',
  'Align centre',
  'Align right',
  'Insert image',
  'Insert table'
]

describe('Toolbar layout', () => {
  it('wraps its items inside a narrow container without overflowing', () => {
    render(
      <div style={{ width: 320 }}>
        <Toolbar aria-label='Formatting'>
          {ACTIONS.map((action) => (
            <Toolbar.Button key={action}>{action}</Toolbar.Button>
          ))}
        </Toolbar>
      </div>
    )
    const toolbar = screen.getByRole('toolbar')
    const box = toolbar.getBoundingClientRect()
    const buttons = screen.getAllByRole('button')
    const rows = new Set(
      buttons.map((button) => Math.round(button.getBoundingClientRect().top))
    )

    expect(toolbar.scrollWidth).toBeLessThanOrEqual(toolbar.clientWidth)
    expect(rows.size).toBeGreaterThan(1)
    for (const button of buttons)
      expect(button.getBoundingClientRect().right).toBeLessThanOrEqual(
        box.right + 0.5
      )
  })

  it('draws a separator across a horizontal toolbar', () => {
    render(
      <Toolbar aria-label='Formatting'>
        <Toolbar.Button>Bold</Toolbar.Button>
        <Toolbar.Separator />
        <Toolbar.Button>Italic</Toolbar.Button>
      </Toolbar>
    )
    const separator = screen.getByRole('separator').getBoundingClientRect()
    expect(separator.height).toBeGreaterThan(separator.width)
  })

  it('draws a separator across a vertical toolbar', () => {
    render(
      <Toolbar aria-label='Formatting' orientation='vertical'>
        <Toolbar.Button>Bold</Toolbar.Button>
        <Toolbar.Separator />
        <Toolbar.Button>Italic</Toolbar.Button>
      </Toolbar>
    )
    const separator = screen.getByRole('separator').getBoundingClientRect()
    expect(separator.width).toBeGreaterThan(separator.height)
  })

  it('stacks a vertical toolbar in a column', () => {
    render(
      <Toolbar aria-label='Formatting' orientation='vertical'>
        <Toolbar.Button>Bold</Toolbar.Button>
        <Toolbar.Button>Italic</Toolbar.Button>
      </Toolbar>
    )
    const bold = screen.getByRole('button', { name: 'Bold' })
    const italic = screen.getByRole('button', { name: 'Italic' })
    expect(italic.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      bold.getBoundingClientRect().bottom
    )
  })

  it.each(['sm', 'md', 'lg'] as const)(
    'sizes its buttons and links like a %s Button',
    (size) => {
      render(
        <>
          <Button size={size}>Reference</Button>
          <Toolbar aria-label='Formatting' size={size}>
            <Toolbar.Button>Bold</Toolbar.Button>
            <Toolbar.Link href='/help'>Help</Toolbar.Link>
          </Toolbar>
        </>
      )
      const height = (element: HTMLElement) =>
        element.getBoundingClientRect().height
      const reference = height(
        screen.getByRole('button', { name: 'Reference' })
      )
      expect(height(screen.getByRole('button', { name: 'Bold' }))).toBe(
        reference
      )
      expect(height(screen.getByRole('link', { name: 'Help' }))).toBe(reference)
    }
  )
})
