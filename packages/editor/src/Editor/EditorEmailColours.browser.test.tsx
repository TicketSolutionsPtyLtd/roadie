import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { Field } from '@oztix/roadie-components/field'

import { Editor } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import { EMAIL_BLOCK_INSET } from '../email/mjmlTree'
import { type EmailTheme, defaultEmailTheme } from '../email/theme'
import type { EditorValue } from '../schema'
import { EMAIL_WIDTH } from '../schema/emailAttrs'
import { emailCanvasStyle } from './emailCanvas'

const LABEL = 'Newsletter'
const TICKETS = 'https://www.oztix.com.au/ochre-kite-weekender'

const value: EditorValue = {
  version: 1,
  preset: 'email',
  doc: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Gates 11am, ' },
          {
            type: 'text',
            text: 'all ages',
            marks: [{ type: 'link', attrs: { href: TICKETS } }]
          }
        ]
      },
      {
        type: 'button',
        attrs: { href: TICKETS },
        content: [{ type: 'text', text: 'Get tickets' }]
      },
      {
        type: 'button',
        attrs: { href: TICKETS, emphasis: 'normal' },
        content: [{ type: 'text', text: 'Lineup' }]
      },
      {
        type: 'button',
        attrs: { href: TICKETS, emphasis: 'subtle' },
        content: [{ type: 'text', text: 'Set times' }]
      },
      { type: 'horizontalRule' }
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

const rgb = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16))
  return `rgb(${r}, ${g}, ${b})`
}

async function renderEmail(
  props: { theme?: Partial<EmailTheme> } = {},
  dark = true
) {
  render(
    <div className={dark ? 'dark' : undefined}>
      <Editor aria-label={LABEL} defaultValue={value} {...props} />
    </div>
  )
  const canvas = await screen.findByRole('textbox', { name: LABEL })
  await screen.findByText('Set times')
  const styleOf = (text: string) =>
    getComputedStyle(
      screen.getByText(text).closest<HTMLElement>('[data-type="button"]')!
    )
  return { canvas, styleOf }
}

describe('Editor email colours', () => {
  it('keeps an email light in a dark app, as it sends', async () => {
    const { canvas } = await renderEmail()
    const canvasStyle = getComputedStyle(canvas)
    expect(canvasStyle.backgroundColor).toBe(rgb(defaultEmailTheme.background))
    expect(canvasStyle.colorScheme).toBe('light')
    expect(canvasStyle.fontFamily).toBe('Helvetica, Arial, sans-serif')
    expect(getComputedStyle(screen.getByText(/Gates 11am/)).color).toBe(
      rgb(defaultEmailTheme.text)
    )
  })

  it('draws the email in its theme', async () => {
    const theme: Partial<EmailTheme> = {
      background: '#fdf6e3',
      text: '#2b2b2b',
      accent: '#5f270f',
      buttonText: '#fefefe',
      border: '#a0a0a0',
      tint: '#eeeeee',
      divider: '#cccccc',
      fontFamily: 'Georgia, serif'
    }
    const { canvas, styleOf } = await renderEmail({ theme })

    expect(getComputedStyle(canvas).backgroundColor).toBe(rgb('#fdf6e3'))
    expect(getComputedStyle(canvas).fontFamily).toBe('Georgia, serif')
    expect(getComputedStyle(screen.getByText(/Gates 11am/)).color).toBe(
      rgb('#2b2b2b')
    )
    expect(getComputedStyle(screen.getByText('all ages')).color).toBe(
      rgb('#5f270f')
    )
    expect(styleOf('Get tickets').backgroundColor).toBe(rgb('#5f270f'))
    expect(styleOf('Get tickets').color).toBe(rgb('#fefefe'))
    expect(styleOf('Lineup').borderTopColor).toBe(rgb('#a0a0a0'))
    expect(styleOf('Lineup').color).toBe(rgb('#2b2b2b'))
    expect(styleOf('Set times').backgroundColor).toBe(rgb('#eeeeee'))
    const rule = canvas.querySelector('hr')!
    expect(getComputedStyle(rule).borderTopColor).toBe(rgb('#cccccc'))
  })

  it('takes a link and a button colour over the accent', async () => {
    const { styleOf } = await renderEmail({
      theme: { accent: '#5f270f', link: '#004400', button: '#000088' }
    })
    expect(getComputedStyle(screen.getByText('all ages')).color).toBe(
      rgb('#004400')
    )
    expect(styleOf('Get tickets').backgroundColor).toBe(rgb('#000088'))
  })

  it('looks the same in a light app and a dark one', async () => {
    const colours = async (dark: boolean) => {
      const { canvas, styleOf } = await renderEmail({}, dark)
      const result = [
        getComputedStyle(canvas).backgroundColor,
        getComputedStyle(screen.getByText(/Gates 11am/)).color,
        getComputedStyle(screen.getByText('all ages')).color,
        styleOf('Get tickets').backgroundColor,
        styleOf('Get tickets').color,
        styleOf('Lineup').color,
        styleOf('Set times').color
      ]
      cleanup()
      return result
    }
    expect(await colours(true)).toEqual(await colours(false))
  })

  it('fills a subtle button with the tint the email sends, without a theme', async () => {
    const { styleOf } = await renderEmail()
    expect(styleOf('Set times').backgroundColor).toBe(
      rgb(defaultEmailTheme.tint)
    )
    expect(styleOf('Lineup').borderTopColor).toBe(rgb(defaultEmailTheme.border))
  })

  it('selects text in a colour the email’s text reads on, in a dark app', async () => {
    const { canvas } = await renderEmail()
    const selection = getComputedStyle(
      screen.getByText('Gates 11am,'),
      '::selection'
    )
    const darkSelection = (() => {
      const probe = document.createElement('span')
      probe.className = 'dark'
      probe.style.color = 'var(--color-info-3)'
      document.body.append(probe)
      const colour = getComputedStyle(probe).color
      probe.remove()
      return colour
    })()

    expect(selection.backgroundColor).not.toBe(darkSelection)
    const probe = document.createElement('span')
    probe.style.color =
      'color-mix(in oklch, var(--email-link) 22%, var(--email-background))'
    canvas.append(probe)
    const mixed = getComputedStyle(probe).color
    probe.remove()
    expect(selection.backgroundColor).toBe(mixed)
  })
})

describe('Editor email section looks', () => {
  // The look's classes come with the section settings, so the canvas's
  // markup is drawn here as the editor draws it.
  function renderLooked(look: string) {
    render(
      <div className='dark'>
        <div data-slot='editor' data-preset='email' style={emailCanvasStyle()}>
          <div data-email='' className='prose'>
            <div data-type='section' className={`intent-neutral ${look}`}>
              <p>
                Gates 11am, <a href='https://www.oztix.com.au'>all ages</a>
              </p>
              <div data-type='button' className='emphasis-strong intent-accent'>
                Get tickets
              </div>
              <div
                data-type='button'
                className='emphasis-subtle intent-neutral'
              >
                Set times
              </div>
            </div>
          </div>
        </div>
      </div>
    )
    const section = screen
      .getByText('all ages')
      .closest<HTMLElement>('[data-type="section"]')!
    const styleOf = (text: string) =>
      getComputedStyle(
        screen.getByText(text).closest<HTMLElement>('[data-type="button"]')!
      )
    return Promise.resolve({ section, styleOf })
  }

  it('draws an accent section’s blocks in the button’s colours, swapped', async () => {
    const { section, styleOf } = await renderLooked('emphasis-strong')
    const accent = getComputedStyle(section).backgroundColor
    const onAccent = getComputedStyle(screen.getByText(/Gates 11am/)).color

    expect(accent).not.toBe(onAccent)
    expect(getComputedStyle(screen.getByText('all ages')).color).toBe(onAccent)
    expect(styleOf('Get tickets').backgroundColor).toBe(onAccent)
    expect(styleOf('Get tickets').color).toBe(accent)
  })

  it('fills a tinted section with the tint, and its subtle button with the background', async () => {
    const { section, styleOf } = await renderLooked('emphasis-subtle')
    expect(getComputedStyle(section).backgroundColor).toBe(
      rgb(defaultEmailTheme.tint)
    )
    expect(styleOf('Set times').backgroundColor).toBe(
      rgb(defaultEmailTheme.background)
    )
    expect(getComputedStyle(screen.getByText(/Gates 11am/)).color).toBe(
      rgb(defaultEmailTheme.text)
    )
  })
})

describe('Editor email layout, as it sends', () => {
  it.each([390, 900])(
    'wraps text in the column the sent email does, at %ipx',
    async (width) => {
      render(
        <div style={{ width }}>
          <Editor aria-label={LABEL} defaultValue={value} />
        </div>
      )
      const line = (await screen.findByText('Gates 11am,')).closest('p')!
      const canvas = screen.getByRole('textbox', { name: LABEL })
      const sent = Math.min(EMAIL_WIDTH, canvas.getBoundingClientRect().width)
      expect(line.getBoundingClientRect().width).toBeCloseTo(
        sent - 2 * EMAIL_BLOCK_INSET,
        0
      )
    }
  )

  it('sets columns’ text 12px further out than a line outside them', async () => {
    render(
      <div style={{ width: 900 }}>
        <Editor
          aria-label={LABEL}
          defaultValue={{
            version: 1,
            preset: 'email',
            doc: {
              type: 'doc',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Intro' }]
                },
                {
                  type: 'columns',
                  content: ['Left', 'Right'].map((text) => ({
                    type: 'column',
                    content: [
                      { type: 'paragraph', content: [{ type: 'text', text }] }
                    ]
                  }))
                }
              ]
            }
          }}
        />
      </div>
    )
    const intro = await screen.findByText('Intro')
    const left = (text: string) =>
      screen.getByText(text).getBoundingClientRect().left
    const right = (text: string) =>
      screen.getByText(text).closest('p')!.getBoundingClientRect().right

    expect(left('Intro') - left('Left')).toBeCloseTo(12, 0)
    const canvas = screen
      .getByRole('textbox', { name: LABEL })
      .getBoundingClientRect()
    expect(canvas.right - right('Right')).toBeCloseTo(12, 0)
    expect(
      right('Right') - intro.closest('p')!.getBoundingClientRect().right
    ).toBeCloseTo(12, 0)
  })

  it('keeps columns inside an invalid boxless email’s edge', async () => {
    render(
      <Field invalid>
        <Field.Label>Newsletter</Field.Label>
        <Editor
          emphasis='subtler'
          defaultValue={{
            version: 1,
            preset: 'email',
            doc: {
              type: 'doc',
              content: [
                {
                  type: 'columns',
                  content: ['Left', 'Right'].map((text) => ({
                    type: 'column',
                    content: [
                      { type: 'paragraph', content: [{ type: 'text', text }] }
                    ]
                  }))
                }
              ]
            }
          }}
        />
      </Field>
    )
    const left = await screen.findByText('Left')
    const canvas = screen.getByRole('textbox', { name: 'Newsletter' })
    expect(canvas).toHaveAttribute('aria-invalid', 'true')
    const edge =
      canvas.getBoundingClientRect().left +
      parseFloat(getComputedStyle(canvas).borderInlineStartWidth)
    // The column's 12px, past the edge's own 10px gap.
    expect(left.getBoundingClientRect().left - edge).toBeCloseTo(22, 0)
  })
})
