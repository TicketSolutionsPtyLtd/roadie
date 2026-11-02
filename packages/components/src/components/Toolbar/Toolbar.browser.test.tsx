import { type ReactNode } from 'react'

import { cleanup, render, screen, within } from '@testing-library/react'
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

import { Toolbar } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { focusRing } from '../../css/testUtils'
import { Button } from '../Button'
import { useStylesheet } from '../Pane/testUtils'
import { Tooltip } from '../Tooltip'

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

  it.each(['sm', 'md', 'lg'] as const)(
    'sizes every kind of item to the toolbar at %s, with icon-only ones square',
    (size) => {
      const icon = <svg viewBox='0 0 16 16' className='size-4' />
      render(
        <Toolbar aria-label='Formatting' size={size}>
          <Toolbar.Toggle aria-label='Bold'>{icon}</Toolbar.Toggle>
          <Toolbar.ToggleGroup aria-label='Alignment'>
            <Toolbar.Toggle value='left' aria-label='Align left'>
              {icon}
            </Toolbar.Toggle>
          </Toolbar.ToggleGroup>
          <Toolbar.Button aria-label='Undo'>{icon}</Toolbar.Button>
          <Toolbar.Button href='/help' aria-label='Help'>
            {icon}
          </Toolbar.Button>
          <Toolbar.Button>Save draft</Toolbar.Button>
        </Toolbar>
      )
      const box = (name: string) =>
        (
          screen.queryByRole('button', { name }) ??
          screen.getByRole('link', { name })
        ).getBoundingClientRect()
      const height = box('Save draft').height
      for (const name of ['Bold', 'Align left', 'Undo', 'Help']) {
        expect(box(name).height).toBe(height)
        expect(box(name).width).toBe(height)
      }
    }
  )

  it('slides its fill to a toggle that is also a tooltip trigger', async () => {
    render(
      <Toolbar aria-label='Formatting'>
        <Toolbar.ToggleGroup aria-label='List' defaultValue={['bulleted']}>
          {['bulleted', 'numbered'].map((value) => (
            <Tooltip key={value}>
              <Tooltip.Trigger
                render={<Toolbar.Toggle value={value}>{value}</Toolbar.Toggle>}
              />
              <Tooltip.Content>{value}</Tooltip.Content>
            </Tooltip>
          ))}
        </Toolbar.ToggleGroup>
      </Toolbar>
    )
    const indicator = document.querySelector<HTMLElement>(
      '[data-slot="toolbar-toggle-group-indicator"]'
    )!
    await expect.poll(() => indicator.hasAttribute('data-ready')).toBe(true)

    const numbered = screen.getByRole('button', { name: 'numbered' })
    numbered.click()

    await expect
      .poll(() => indicator.style.getPropertyValue('--pressed-item-left'))
      .toBe(`${numbered.offsetLeft}px`)
  })

  it('slides one pressed fill between the toggles of a single-value group', async () => {
    const icon = <svg viewBox='0 0 16 16' className='size-4' />
    render(
      <Toolbar aria-label='Formatting'>
        <Toolbar.ToggleGroup aria-label='Alignment' defaultValue={['left']}>
          <Toolbar.Toggle value='left' aria-label='Align left'>
            {icon}
          </Toolbar.Toggle>
          <Toolbar.Toggle value='right' aria-label='Align right'>
            {icon}
          </Toolbar.Toggle>
        </Toolbar.ToggleGroup>
      </Toolbar>
    )
    const right = screen.getByRole('button', { name: 'Align right' })
    const indicator = document.querySelector<HTMLElement>(
      '[data-slot="toolbar-toggle-group-indicator"]'
    )!
    await expect.poll(() => indicator.hasAttribute('data-ready')).toBe(true)
    expect(getComputedStyle(indicator).transitionProperty).toMatch(/left/)

    right.click()

    await expect
      .poll(() => indicator.style.getPropertyValue('--pressed-item-left'))
      .toBe(`${right.offsetLeft}px`)
    // The indicator draws the fill, so the toggle doesn't cover its slide.
    expect(getComputedStyle(right).backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(getComputedStyle(indicator).backgroundColor).not.toBe(
      'rgba(0, 0, 0, 0)'
    )
  })

  it('keeps every toggle of a sliding group the same width as presses move', async () => {
    render(
      <Toolbar aria-label='Formatting'>
        <Toolbar.ToggleGroup aria-label='Alignment' defaultValue={['left']}>
          <Toolbar.Toggle value='left'>Left</Toolbar.Toggle>
          <Toolbar.Toggle value='centre'>Centre</Toolbar.Toggle>
        </Toolbar.ToggleGroup>
      </Toolbar>
    )
    const indicator = document.querySelector<HTMLElement>(
      '[data-slot="toolbar-toggle-group-indicator"]'
    )!
    await expect.poll(() => indicator.hasAttribute('data-ready')).toBe(true)
    const widths = () =>
      screen
        .getAllByRole('button')
        .map((toggle) => toggle.getBoundingClientRect().width)
    const before = widths()
    await userEvent.click(screen.getByRole('button', { name: 'Centre' }))
    expect(widths()).toEqual(before)
  })

  it('keeps focus on a toggle as its group empties and fills again', async () => {
    render(
      <Toolbar aria-label='Formatting'>
        <Toolbar.ToggleGroup aria-label='Alignment' defaultValue={['left']}>
          <Toolbar.Toggle value='left'>Left</Toolbar.Toggle>
          <Toolbar.Toggle value='right'>Right</Toolbar.Toggle>
        </Toolbar.ToggleGroup>
      </Toolbar>
    )
    const left = screen.getByRole('button', { name: 'Left' })
    await userEvent.click(left)
    expect(left).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Left' })).toHaveFocus()
    await userEvent.keyboard(' ')
    expect(screen.getByRole('button', { name: 'Left' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByRole('button', { name: 'Left' })).toHaveFocus()
  })

  it('covers the pressed toggle of a vertical group with its fill', async () => {
    render(
      <Toolbar aria-label='Formatting' orientation='vertical'>
        <Toolbar.ToggleGroup aria-label='Alignment' defaultValue={['right']}>
          <Toolbar.Toggle value='left'>Left</Toolbar.Toggle>
          <Toolbar.Toggle value='right'>Right</Toolbar.Toggle>
        </Toolbar.ToggleGroup>
      </Toolbar>
    )
    const right = screen.getByRole('button', { name: 'Right' })
    const indicator = document.querySelector<HTMLElement>(
      '[data-slot="toolbar-toggle-group-indicator"]'
    )!
    await expect.poll(() => indicator.hasAttribute('data-ready')).toBe(true)
    await expect
      .poll(() => indicator.getBoundingClientRect().width)
      .toBeCloseTo(right.getBoundingClientRect().width, 0)
    expect(indicator.getBoundingClientRect().top).toBe(
      right.getBoundingClientRect().top
    )
  })

  it('fills each pressed toggle of a multiple group itself', () => {
    render(
      <Toolbar aria-label='Formatting'>
        <Toolbar.ToggleGroup
          aria-label='Styles'
          multiple
          defaultValue={['bold']}
        >
          <Toolbar.Toggle value='bold'>Bold</Toolbar.Toggle>
          <Toolbar.Toggle value='italic'>Italic</Toolbar.Toggle>
        </Toolbar.ToggleGroup>
      </Toolbar>
    )
    expect(
      document.querySelector('[data-slot="toolbar-toggle-group-indicator"]')
    ).toBeNull()
    expect(
      getComputedStyle(screen.getByRole('button', { name: 'Bold' }))
        .backgroundColor
    ).not.toBe('rgba(0, 0, 0, 0)')
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
    const bold = screen
      .getByRole('button', { name: 'Bold' })
      .getBoundingClientRect()
    expect(separator.height).toBeGreaterThan(separator.width)
    expect(separator.top - bold.top).toBe(6)
    expect(bold.bottom - separator.bottom).toBe(6)
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
    const bold = screen
      .getByRole('button', { name: 'Bold' })
      .getBoundingClientRect()
    expect(separator.width).toBeGreaterThan(separator.height)
    expect(separator.left - bold.left).toBe(6)
    expect(bold.right - separator.right).toBe(6)
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

  it('stacks a toggle group in a vertical toolbar in a column', () => {
    render(
      <Toolbar aria-label='Formatting' orientation='vertical'>
        <Toolbar.ToggleGroup aria-label='Alignment'>
          <Toolbar.Toggle value='left'>Left</Toolbar.Toggle>
          <Toolbar.Toggle value='right'>Right</Toolbar.Toggle>
        </Toolbar.ToggleGroup>
      </Toolbar>
    )
    const left = screen.getByRole('button', { name: 'Left' })
    const right = screen.getByRole('button', { name: 'Right' })
    expect(right.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      left.getBoundingClientRect().bottom
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
            <Toolbar.Button href='/help'>Help</Toolbar.Button>
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

describe('Flush toolbar', () => {
  const surfaceOf = (name: string) =>
    screen
      .getByRole('toolbar', { name })
      .closest<HTMLElement>('[data-slot="toolbar-surface"]')!

  it.each(['normal', 'subtle', 'subtler', 'raised', 'floating'] as const)(
    'drops the rounding, border and shadow at %s, so the parent draws the edge',
    (emphasis) => {
      render(
        <Toolbar flush emphasis={emphasis} aria-label='History'>
          <Toolbar.Button>Undo</Toolbar.Button>
        </Toolbar>
      )
      const surface = getComputedStyle(surfaceOf('History'))

      expect(surface.borderTopWidth).toBe('0px')
      expect(surface.borderBottomWidth).toBe('0px')
      expect(surface.borderTopLeftRadius).toBe('0px')
      expect(surface.boxShadow).toBe('none')
    }
  )

  it.each([
    ['sm', 32],
    ['md', 40],
    ['lg', 48]
  ] as const)(
    'insets its controls by 4px at %s, so a hover clears the edge',
    (size, control) => {
      render(
        <Toolbar flush size={size} aria-label='History'>
          <Toolbar.Button>Undo</Toolbar.Button>
        </Toolbar>
      )
      const surface = surfaceOf('History').getBoundingClientRect()
      const undo = screen
        .getByRole('button', { name: 'Undo' })
        .getBoundingClientRect()

      expect(undo.top - surface.top).toBe(4)
      expect(undo.left - surface.left).toBe(4)
      expect(surface.height).toBe(control + 8)
    }
  )

  it('keeps the gap between its controls', () => {
    render(
      <>
        <Toolbar aria-label='Inset'>
          <Toolbar.Button>Undo</Toolbar.Button>
          <Toolbar.Button>Redo</Toolbar.Button>
        </Toolbar>
        <Toolbar flush aria-label='Flush'>
          <Toolbar.Button>Undo</Toolbar.Button>
          <Toolbar.Button>Redo</Toolbar.Button>
        </Toolbar>
      </>
    )
    const gap = (name: string) => {
      const toolbar = within(screen.getByRole('toolbar', { name }))
      const box = (button: string) =>
        toolbar.getByRole('button', { name: button }).getBoundingClientRect()
      return box('Redo').left - box('Undo').right
    }
    expect(gap('Flush')).toBe(4)
    expect(gap('Inset')).toBe(4)
  })

  it('runs across its parent with w-full', () => {
    render(
      <div style={{ display: 'grid', width: 600 }}>
        <Toolbar flush className='w-full' aria-label='History'>
          <Toolbar.Button>Undo</Toolbar.Button>
        </Toolbar>
      </div>
    )
    expect(surfaceOf('History').getBoundingClientRect().width).toBe(600)
  })

  // The inset holds the ring, where the scrolling row would clip it.
  it.each(['Undo', 'Save draft'])(
    'draws the focus ring around %s within the inset',
    async (name) => {
      onTestFinished(useStylesheet('* { transition-duration: 0s !important }'))
      render(
        <Toolbar flush aria-label='History'>
          <Toolbar.Button>Undo</Toolbar.Button>
          <Toolbar.Group aria-label='Draft'>
            <Toolbar.Button>Save draft</Toolbar.Button>
          </Toolbar.Group>
        </Toolbar>
      )
      // Firefox shows no ring for scripted focus inside a composite, so the keys move it.
      await userEvent.keyboard('{Tab}')
      if (name === 'Save draft') await userEvent.keyboard('{ArrowRight}')
      const control = screen.getByRole('button', { name })
      expect(control).toHaveFocus()
      const ring = focusRing(control)
      const surface = surfaceOf('History').getBoundingClientRect()
      const box = control.getBoundingClientRect()
      const width = parseFloat(ring.width) + parseFloat(ring.offset)
      expect(box.top - width).toBeGreaterThanOrEqual(surface.top)
      expect(box.bottom + width).toBeLessThanOrEqual(surface.bottom)
    }
  )
})

describe('Toolbar on a phone', () => {
  beforeAll(async () => {
    await page.viewport(390, 844)
  })
  afterAll(async () => {
    await page.viewport(1920, 1080)
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

  it('scrolls its row to a focused item without scrolling the page', async () => {
    render(
      <>
        <div style={{ height: 2000 }} />
        <div style={{ width: 320 }}>
          <Toolbar aria-label='Formatting'>
            {ACTIONS.map((action) => (
              <Toolbar.Button key={action}>{action}</Toolbar.Button>
            ))}
          </Toolbar>
        </div>
        <div style={{ height: 2000 }} />
      </>
    )
    const toolbar = screen.getByRole('toolbar')
    // Half the toolbar below the fold.
    window.scrollTo(
      0,
      toolbar.getBoundingClientRect().top +
        window.scrollY -
        window.innerHeight +
        toolbar.getBoundingClientRect().height / 2
    )
    const before = window.scrollY
    const last = screen.getByRole('button', { name: ACTIONS.at(-1) })
    const viewport = toolbar.closest<HTMLElement>(
      '[data-slot="scroll-area-viewport"]'
    )!

    last.focus({ preventScroll: true })

    await expect
      .poll(() => last.getBoundingClientRect().right)
      .toBeLessThanOrEqual(viewport.getBoundingClientRect().right + 0.5)
    expect(window.scrollY).toBe(before)
    window.scrollTo(0, 0)
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
