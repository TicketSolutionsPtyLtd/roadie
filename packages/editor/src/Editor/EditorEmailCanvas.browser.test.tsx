import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Editor } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import type { EditorValue, JSONContent } from '../schema'

const LABEL = 'Newsletter'

const p = (text: string): JSONContent => ({
  type: 'paragraph',
  content: [{ type: 'text', text }]
})

const column = (text: string): JSONContent => ({
  type: 'column',
  content: [p(text)]
})

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

describe('Editor email canvas', () => {
  const twoColumns: EditorValue = {
    version: 1,
    preset: 'email',
    doc: {
      type: 'doc',
      content: [
        { type: 'columns', content: [column('Doors 7pm'), column('All ages')] }
      ]
    }
  }

  async function columnBoxes(width: number) {
    render(
      <div style={{ width }}>
        <Editor aria-label={LABEL} defaultValue={twoColumns} />
      </div>
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await screen.findByText('Doors 7pm')
    const boxes = [...textbox.querySelectorAll('[data-type="column"]')].map(
      (element) => element.getBoundingClientRect()
    )
    return { textbox: textbox.getBoundingClientRect(), boxes }
  }

  it('is at most 600px wide, centred in a wider editor', async () => {
    const { textbox: canvas } = await columnBoxes(900)
    expect(canvas.width).toBe(600)
    const editor = screen
      .getByRole('textbox', { name: LABEL })
      .closest('[data-slot="editor"]')!
      .getBoundingClientRect()
    expect(canvas.left - editor.left).toBeCloseTo(
      editor.right - canvas.right,
      0
    )
  })

  it('puts columns side by side at email width', async () => {
    const { boxes } = await columnBoxes(900)
    expect(boxes[0]!.top).toBe(boxes[1]!.top)
    expect(boxes[0]!.width).toBeCloseTo(boxes[1]!.width, 0)
    expect(boxes[1]!.left - boxes[0]!.right).toBeCloseTo(24, 0)
  })

  it('stacks columns at phone width', async () => {
    const { boxes } = await columnBoxes(375)
    expect(boxes[1]!.top - boxes[0]!.bottom).toBeCloseTo(16, 0)
  })

  describe('spacing', () => {
    const TICKETS = 'https://www.oztix.com.au/ochre-kite-weekender'
    const card: EditorValue = {
      version: 1,
      preset: 'email',
      doc: {
        type: 'doc',
        content: [
          p('Two weeks to go'),
          {
            type: 'section',
            content: [
              {
                type: 'heading',
                attrs: { level: 2 },
                content: [{ type: 'text', text: 'Ochre Kite Weekender' }]
              },
              p('Gates 11am, all ages.'),
              {
                type: 'button',
                attrs: { href: TICKETS },
                content: [{ type: 'text', text: 'Get tickets' }]
              }
            ]
          }
        ]
      }
    }

    async function renderCard() {
      render(
        <>
          <Editor aria-label={LABEL} defaultValue={card} />
          <p>Outside</p>
        </>
      )
      await screen.findByText('Get tickets')
      const box = (text: string) =>
        screen
          .getByText(text)
          .closest<HTMLElement>('h2, p, [data-type="button"]')!
          .getBoundingClientRect()
      const section = screen
        .getByText('Gates 11am, all ages.')
        .closest<HTMLElement>('[data-type="section"]')!
      return { box, section }
    }

    it('puts 16px between blocks, whatever they are, as the email does', async () => {
      const { box } = await renderCard()
      const heading = box('Ochre Kite Weekender')
      const text = box('Gates 11am, all ages.')
      const button = box('Get tickets')
      expect(text.top - heading.bottom).toBeCloseTo(16, 0)
      expect(button.top - text.bottom).toBeCloseTo(16, 0)
    })

    it('sizes a heading as the email does', async () => {
      await renderCard()
      const heading = getComputedStyle(screen.getByText('Ochre Kite Weekender'))
      expect(heading.fontSize).toBe('24px')
      expect(heading.lineHeight).toBe('32px')
    })

    it('pads a section 16px above and below, and not at its sides', async () => {
      const { box, section } = await renderCard()
      const edges = section.getBoundingClientRect()
      expect(box('Ochre Kite Weekender').top - edges.top).toBeCloseTo(16, 0)
      expect(edges.bottom - box('Get tickets').bottom).toBeCloseTo(16, 0)
      expect(box('Gates 11am, all ages.').left).toBeCloseTo(edges.left, 0)
    })

    it('outlines a section only under the pointer, outside its box', async () => {
      const { section } = await renderCard()
      // The last test can leave the pointer over the section.
      await userEvent.hover(screen.getByText('Outside'))
      // Past the outline's fade, which is never transparent midway.
      await Promise.all(section.getAnimations().map((fade) => fade.finished))
      const resting = getComputedStyle(section)
      // The outline fades out, so a hover the last test left takes a moment.
      await waitFor(() =>
        expect(resting.outlineColor).toMatch(/rgba\(0, 0, 0, 0\)|transparent/)
      )
      expect(resting.borderTopWidth).toBe('0px')

      await userEvent.hover(section)

      await expect
        .poll(() => getComputedStyle(section).outlineColor)
        .not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/)
      expect(getComputedStyle(section).outlineStyle).toBe('dashed')
    })

    it('outlines the section holding the caret', async () => {
      const { section } = await renderCard()
      await userEvent.click(screen.getByText('Gates 11am, all ages.'))
      await userEvent.hover(screen.getByText('Outside'))
      // Past the hover's fade, which is never transparent midway.
      await Promise.all(section.getAnimations().map((fade) => fade.finished))

      expect(getComputedStyle(section).outlineColor).not.toMatch(
        /rgba\(0, 0, 0, 0\)|transparent/
      )
    })

    it('keeps the chosen halo on a section while its menu is open', async () => {
      const { section } = await renderCard()
      await userEvent.hover(section, { position: { x: 4, y: 4 } })
      await userEvent.click(
        await screen.findByRole('button', { name: 'Block actions' })
      )

      await expect
        .poll(() => section.hasAttribute('data-menu-block'))
        .toBe(true)
      expect(getComputedStyle(section).outlineStyle).toBe('solid')
      // Flush with the tint, or a stripe shows between them.
      expect(getComputedStyle(section).outlineOffset).toBe('0px')
    })

    it('lines a section’s grip up with its first line, not its padding', async () => {
      const { box, section } = await renderCard()
      await userEvent.hover(section, { position: { x: 4, y: 4 } })
      const grip = await screen.findByRole('button', { name: 'Block actions' })
      const heading = box('Ochre Kite Weekender')
      const centre = () => {
        const { top, bottom } = grip.getBoundingClientRect()
        return (top + bottom) / 2
      }

      await expect.poll(centre).toBeGreaterThan(heading.top)
      expect(centre()).toBeLessThan(heading.bottom)
    })

    it('outlines a spacer only under the pointer or at the caret', async () => {
      render(
        <>
          <Editor
            aria-label={LABEL}
            defaultValue={{
              version: 1,
              preset: 'email',
              doc: {
                type: 'doc',
                content: [
                  p('Two weeks to go'),
                  { type: 'spacer', attrs: { height: 32 } },
                  p('Doors 7pm')
                ]
              }
            }}
          />
          <p>Outside</p>
        </>
      )
      const doors = await screen.findByText('Doors 7pm')
      const spacer = document.querySelector<HTMLElement>(
        '[data-type="spacer"]'
      )!
      const clear = /rgba\(0, 0, 0, 0\)|transparent/
      const colour = () => getComputedStyle(spacer).outlineColor
      // The last test can leave the pointer where the spacer is.
      await userEvent.hover(screen.getByText('Outside'))
      await expect.poll(colour).toMatch(clear)

      await userEvent.hover(spacer)
      await expect.poll(colour).not.toMatch(clear)
      expect(getComputedStyle(spacer).outlineStyle).toBe('dashed')

      await userEvent.hover(screen.getByText('Outside'))
      await expect.poll(colour).toMatch(clear)
      await userEvent.click(doors)
      await userEvent.keyboard('{Home}{ArrowUp}')
      await expect.poll(colour).not.toMatch(clear)
    })

    it('lines a grip up with the top of a section that starts with an image', async () => {
      render(
        <Editor
          aria-label={LABEL}
          defaultValue={{
            version: 1,
            preset: 'email',
            doc: {
              type: 'doc',
              content: [
                {
                  type: 'section',
                  content: [
                    {
                      type: 'image',
                      attrs: { src: 'https://example.test/a.webp', alt: 'A' }
                    },
                    p('Gates 11am')
                  ]
                }
              ]
            }
          }}
        />
      )
      const text = await screen.findByText('Gates 11am')
      const section = text.closest<HTMLElement>('[data-type="section"]')!
      await userEvent.hover(section, { position: { x: 4, y: 4 } })
      const grip = await screen.findByRole('button', { name: 'Block actions' })

      await expect
        .poll(() => grip.getBoundingClientRect().bottom)
        .toBeLessThanOrEqual(text.getBoundingClientRect().top)
    })

    it('keeps the chosen halo on a spacer while its menu is open', async () => {
      render(
        <Editor
          aria-label={LABEL}
          defaultValue={{
            version: 1,
            preset: 'email',
            doc: {
              type: 'doc',
              content: [
                p('Two weeks to go'),
                { type: 'spacer', attrs: { height: 32 } }
              ]
            }
          }}
        />
      )
      await screen.findByText('Two weeks to go')
      const spacer = document.querySelector<HTMLElement>(
        '[data-type="spacer"]'
      )!
      await userEvent.hover(spacer)
      await userEvent.click(
        await screen.findByRole('button', { name: 'Block actions' })
      )

      await expect.poll(() => spacer.hasAttribute('data-menu-block')).toBe(true)
      expect(getComputedStyle(spacer).outlineStyle).toBe('solid')
      expect(getComputedStyle(spacer).outlineOffset).toBe('0px')
    })

    it('puts 8px either side of a spacer, which the email doesn’t pad', async () => {
      render(
        <Editor
          aria-label={LABEL}
          defaultValue={{
            version: 1,
            preset: 'email',
            doc: {
              type: 'doc',
              content: [
                p('Two weeks to go'),
                { type: 'spacer', attrs: { height: 32 } },
                p('Gates 11am'),
                {
                  type: 'section',
                  content: [
                    p('Lineup'),
                    { type: 'spacer', attrs: { height: 32 } },
                    p('All ages')
                  ]
                }
              ]
            }
          }}
        />
      )
      await screen.findByText('All ages')
      const box = (text: string) =>
        screen.getByText(text).getBoundingClientRect()
      const [top, inSection] = [
        ...document.querySelectorAll('[data-type="spacer"]')
      ].map((spacer) => spacer.getBoundingClientRect())

      expect(top!.top - box('Two weeks to go').bottom).toBeCloseTo(8, 0)
      expect(box('Gates 11am').top - top!.bottom).toBeCloseTo(8, 0)
      expect(inSection!.top - box('Lineup').bottom).toBeCloseTo(8, 0)
      expect(box('All ages').top - inSection!.bottom).toBeCloseTo(8, 0)
    })
  })

  it('keeps a leading image in place while the gap cursor shows before it', async () => {
    render(
      <Editor
        aria-label={LABEL}
        // WebKit lays out this unloadable image at no size in a floating
        // email, leaving nothing to click.
        toolbar='docked'
        defaultValue={{
          version: 1,
          preset: 'email',
          doc: {
            type: 'doc',
            content: [
              {
                type: 'image',
                attrs: {
                  src: 'https://example.test/header.webp',
                  alt: 'A crowd'
                }
              },
              p('Doors 7pm')
            ]
          }
        }}
      />
    )
    await screen.findByText('Doors 7pm')
    const image = await screen.findByAltText('A crowd', {}, { timeout: 5000 })
    // A loaded WebKit lays the failed image out late, with no size till then.
    await expect
      .poll(() => image.getBoundingClientRect().height, { timeout: 5000 })
      .toBeGreaterThan(0)
    const block = image.closest<HTMLElement>('[data-slot="editor-image"]')!
    const top = block.getBoundingClientRect().top

    await userEvent.click(image)
    await expect.poll(() => block.hasAttribute('data-selected')).toBe(true)
    // Out of the settings the click opens, back to the selected image.
    const settings = await screen.findByRole('dialog', {
      name: 'Image settings'
    })
    // Once it has focus, or Escape goes to the editor instead.
    await waitFor(() =>
      expect(settings.contains(document.activeElement)).toBe(true)
    )
    await userEvent.keyboard('{Escape}')
    await expect.poll(() => screen.queryByRole('dialog')).toBe(null)
    await userEvent.keyboard('{ArrowLeft}')

    await expect
      .poll(() => document.querySelector('.ProseMirror-gapcursor'))
      .not.toBeNull()
    expect(block.getBoundingClientRect().top).toBe(top)
  })

  it('keeps 8px after a spacer while the gap cursor shows there', async () => {
    render(
      <Editor
        aria-label={LABEL}
        // As above, so WebKit gives the image a size to click.
        toolbar='docked'
        defaultValue={{
          version: 1,
          preset: 'email',
          doc: {
            type: 'doc',
            content: [
              p('Two weeks to go'),
              { type: 'spacer', attrs: { height: 32 } },
              {
                type: 'image',
                attrs: {
                  src: 'https://example.test/header.webp',
                  alt: 'A crowd'
                }
              },
              p('Doors 7pm')
            ]
          }
        }}
      />
    )
    await screen.findByText('Doors 7pm')
    const image = await screen.findByAltText('A crowd', {}, { timeout: 5000 })
    const block = image.closest<HTMLElement>('[data-slot="editor-image"]')!
    const spacer = document.querySelector<HTMLElement>('[data-type="spacer"]')!

    await userEvent.click(image)
    await expect.poll(() => block.hasAttribute('data-selected')).toBe(true)
    // Out of the settings the click opens, back to the selected image.
    const settings = await screen.findByRole('dialog', {
      name: 'Image settings'
    })
    // Once it has focus, or Escape goes to the editor instead.
    await waitFor(() =>
      expect(settings.contains(document.activeElement)).toBe(true)
    )
    await userEvent.keyboard('{Escape}')
    await expect.poll(() => screen.queryByRole('dialog')).toBe(null)
    await userEvent.keyboard('{ArrowLeft}')

    await expect
      .poll(() =>
        spacer.nextElementSibling?.classList.contains('ProseMirror-gapcursor')
      )
      .toBe(true)
    expect(
      block.getBoundingClientRect().top - spacer.getBoundingClientRect().bottom
    ).toBeCloseTo(8, 0)
  })

  it('keeps a long word inside a stacked column', async () => {
    const link =
      'https://www.oztix.com.au/ochre-kite-weekender-tickets-and-camping'
    const longWord: EditorValue = {
      ...twoColumns,
      doc: {
        type: 'doc',
        content: [
          { type: 'columns', content: [column(link), column('All ages')] }
        ]
      }
    }
    render(
      <div style={{ width: 375 }}>
        <Editor aria-label={LABEL} defaultValue={longWord} />
      </div>
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await screen.findByText(link)
    const [first] = textbox.querySelectorAll('[data-type="column"]')
    expect(first!.getBoundingClientRect().right).toBeLessThanOrEqual(
      textbox.getBoundingClientRect().right
    )
  })

  it('runs a line to the canvas’s full width at any size', async () => {
    const line =
      'Gates open at 11am with food trucks, a kids’ zone and a silent disco running until the headliners take the main stage at 9pm.'
    render(
      <div style={{ width: 900 }}>
        <Editor
          aria-label={LABEL}
          size='sm'
          defaultValue={{
            ...twoColumns,
            doc: { type: 'doc', content: [p(line)] }
          }}
        />
      </div>
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    const paragraph = await screen.findByText(line)
    const { paddingLeft, paddingRight } = getComputedStyle(textbox)
    expect(paragraph.getBoundingClientRect().width).toBeCloseTo(
      textbox.clientWidth - parseFloat(paddingLeft) - parseFloat(paddingRight),
      0
    )
  })

  it('outlines sections, columns and spacers, drawing a spacer at its height', async () => {
    render(
      <Editor
        aria-label={LABEL}
        defaultValue={{
          ...twoColumns,
          doc: {
            type: 'doc',
            content: [
              { type: 'section', content: [p('Gates 11am')] },
              twoColumns.doc.content![0]!,
              { type: 'spacer', attrs: { height: 48 } }
            ]
          }
        }}
      />
    )
    const textbox = await screen.findByRole('textbox', { name: LABEL })
    await screen.findByText('Gates 11am')
    for (const type of ['section', 'column', 'spacer']) {
      const element = textbox.querySelector(`[data-type="${type}"]`)!
      expect(getComputedStyle(element).outlineStyle, type).toBe('dashed')
    }
    const spacer = textbox.querySelector('[data-type="spacer"]')!
    expect(spacer.getBoundingClientRect().height).toBe(48)
  })
})
