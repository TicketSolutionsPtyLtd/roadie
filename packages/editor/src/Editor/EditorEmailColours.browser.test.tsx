import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { Editor } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import type { EmailTheme } from '../email'
import type { EditorValue } from '../schema'

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

// The light tokens resolve to oklch where the browser supports it.
function tokenColour(token: string) {
  const probe = document.createElement('span')
  probe.style.color = `var(${token})`
  document.body.append(probe)
  const colour = getComputedStyle(probe).color
  probe.remove()
  return colour
}

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
    expect(canvasStyle.backgroundColor).toBe(
      tokenColour('--color-neutral-light-0')
    )
    expect(canvasStyle.colorScheme).toBe('light')
    expect(getComputedStyle(screen.getByText('Gates 11am,')).color).toBe(
      tokenColour('--color-neutral-light-12')
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
      divider: '#cccccc'
    }
    const { canvas, styleOf } = await renderEmail({ theme })

    expect(getComputedStyle(canvas).backgroundColor).toBe(rgb('#fdf6e3'))
    expect(getComputedStyle(screen.getByText('Gates 11am,')).color).toBe(
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
        getComputedStyle(screen.getByText('Gates 11am,')).color,
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
})
