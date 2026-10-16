import { type ReactNode } from 'react'

import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'

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

  it('hugs its items in a stretching parent, so its surface ends after the last', () => {
    render(
      <div style={{ display: 'grid', width: 600 }}>
        <Toolbar aria-label='History'>
          <Toolbar.Button>Undo</Toolbar.Button>
          <Toolbar.Button>Redo</Toolbar.Button>
        </Toolbar>
      </div>
    )
    const toolbar = screen
      .getByRole('toolbar')
      .closest('[data-slot="toolbar-surface"]')!
      .getBoundingClientRect()
    const redo = screen.getByRole('button', { name: 'Redo' })

    expect(toolbar.width).toBeLessThan(600)
    expect(toolbar.right - redo.getBoundingClientRect().right).toBeLessThan(16)
  })

  it('keeps one height at every emphasis, so changing it never shifts the page', () => {
    const emphases = [
      'normal',
      'subtle',
      'subtler',
      'raised',
      'floating'
    ] as const
    render(
      <>
        {emphases.map((emphasis) => (
          <Toolbar key={emphasis} aria-label={emphasis} emphasis={emphasis}>
            <Toolbar.Button>Undo</Toolbar.Button>
          </Toolbar>
        ))}
      </>
    )
    const heights = emphases.map(
      (emphasis) =>
        screen
          .getByRole('toolbar', { name: emphasis })
          .closest('[data-slot="toolbar-surface"]')!
          .getBoundingClientRect().height
    )
    expect(new Set(heights).size).toBe(1)
  })

  it('wraps the items of a group inside a narrow container', () => {
    render(
      <div style={{ width: 320 }}>
        <Toolbar aria-label='Formatting'>
          <Toolbar.Group aria-label='Actions'>
            {ACTIONS.map((action) => (
              <Toolbar.Button key={action}>{action}</Toolbar.Button>
            ))}
          </Toolbar.Group>
        </Toolbar>
      </div>
    )
    const toolbar = screen.getByRole('toolbar')
    const rows = new Set(
      screen
        .getAllByRole('button')
        .map((button) => Math.round(button.getBoundingClientRect().top))
    )
    expect(toolbar.scrollWidth).toBeLessThanOrEqual(toolbar.clientWidth)
    expect(rows.size).toBeGreaterThan(1)
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

  it('stacks a group in a vertical toolbar in a column', () => {
    render(
      <Toolbar aria-label='Formatting' orientation='vertical'>
        <Toolbar.Group aria-label='Text style'>
          <Toolbar.Button>Bold</Toolbar.Button>
          <Toolbar.Button>Italic</Toolbar.Button>
        </Toolbar.Group>
      </Toolbar>
    )
    const bold = screen.getByRole('button', { name: 'Bold' })
    const italic = screen.getByRole('button', { name: 'Italic' })
    expect(italic.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      bold.getBoundingClientRect().bottom
    )
  })

  it.each([
    ['toolbar', (children: ReactNode) => children],
    [
      'group',
      (children: ReactNode) => (
        <Toolbar.Group aria-label='Text style'>{children}</Toolbar.Group>
      )
    ]
  ])(
    'sizes a vertical %s to its widest item and stretches the rest to match',
    (_, wrap) => {
      render(
        <div style={{ width: 400 }}>
          <Toolbar aria-label='Formatting' orientation='vertical'>
            {wrap(
              <>
                <Toolbar.Button>B</Toolbar.Button>
                <Toolbar.Button>Strikethrough</Toolbar.Button>
              </>
            )}
          </Toolbar>
        </div>
      )
      const width = (name: string) =>
        screen.getByRole('button', { name }).getBoundingClientRect().width
      expect(width('B')).toBe(width('Strikethrough'))
      expect(
        screen.getByRole('toolbar').getBoundingClientRect().width
      ).toBeLessThan(400)
    }
  )

  it('sizes its buttons like a md Button by default', () => {
    render(
      <>
        <Button size='md'>Reference</Button>
        <Toolbar aria-label='Formatting'>
          <Toolbar.Button>Bold</Toolbar.Button>
        </Toolbar>
      </>
    )
    const height = (name: string) =>
      screen.getByRole('button', { name }).getBoundingClientRect().height
    expect(height('Bold')).toBe(height('Reference'))
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

describe('Toolbar on a phone', () => {
  beforeAll(async () => {
    await page.viewport(390, 844)
  })
  afterAll(async () => {
    await page.viewport(1280, 720)
  })

  it('keeps its items on one row and scrolls them sideways', () => {
    render(
      <div style={{ width: 320 }}>
        <Toolbar aria-label='Formatting'>
          {ACTIONS.map((action) => (
            <Toolbar.Button key={action}>{action}</Toolbar.Button>
          ))}
        </Toolbar>
      </div>
    )
    const tops = new Set(
      screen
        .getAllByRole('button')
        .map((button) => Math.round(button.getBoundingClientRect().top))
    )
    const viewport = screen
      .getByRole('toolbar')
      .closest<HTMLElement>('[data-slot="scroll-area-viewport"]')!

    expect(tops.size).toBe(1)
    expect(viewport.scrollWidth).toBeGreaterThan(viewport.clientWidth)
    expect(viewport.getBoundingClientRect().width).toBeLessThanOrEqual(320)
  })

  it('scrolls the item the arrow keys reach clear of the faded edges', async () => {
    render(
      <div style={{ width: 320 }}>
        <Toolbar aria-label='Formatting'>
          {ACTIONS.map((action) => (
            <Toolbar.Button key={action}>{action}</Toolbar.Button>
          ))}
        </Toolbar>
      </div>
    )
    const viewport = screen
      .getByRole('toolbar')
      .closest<HTMLElement>('[data-slot="scroll-area-viewport"]')!
    const fade =
      parseFloat(
        getComputedStyle(viewport).getPropertyValue('--scroll-area-fade-size')
      ) * parseFloat(getComputedStyle(document.documentElement).fontSize)
    const clearOfFade = async (name: string, side: 'left' | 'right') => {
      const item = screen.getByRole('button', { name })
      await expect.poll(() => document.activeElement).toBe(item)
      const box = viewport.getBoundingClientRect()
      const rect = item.getBoundingClientRect()
      const gap =
        side === 'right' ? box.right - rect.right : rect.left - box.left
      expect(gap).toBeGreaterThanOrEqual(fade - 1)
    }

    await userEvent.tab()
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}')
    await clearOfFade('Align left', 'right')
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}')
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}')
    await clearOfFade('Align left', 'left')
  })

  it('keeps a group on the same row', () => {
    render(
      <div style={{ width: 320 }}>
        <Toolbar aria-label='Formatting'>
          <Toolbar.Group aria-label='Actions'>
            {ACTIONS.map((action) => (
              <Toolbar.Button key={action}>{action}</Toolbar.Button>
            ))}
          </Toolbar.Group>
        </Toolbar>
      </div>
    )
    const tops = new Set(
      screen
        .getAllByRole('button')
        .map((button) => Math.round(button.getBoundingClientRect().top))
    )
    expect(tops.size).toBe(1)
  })

  it('still stacks a vertical toolbar', () => {
    render(
      <Toolbar aria-label='Formatting' orientation='vertical'>
        <Toolbar.Button>Undo</Toolbar.Button>
        <Toolbar.Button>Redo</Toolbar.Button>
      </Toolbar>
    )
    const [undo, redo] = screen.getAllByRole('button')
    expect(redo!.getBoundingClientRect().top).toBeGreaterThan(
      undo!.getBoundingClientRect().bottom - 1
    )
  })
})
