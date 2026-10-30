import { useState } from 'react'

import { render, screen, waitFor } from '@testing-library/react'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Field } from '@oztix/roadie-components/field'

import { EmailHtmlField } from '.'
import roadieCss from '../../vitest.browser.css?inline'

const LABEL = 'Email HTML'
const TICKETS = 'https://www.oztix.com.au/ochre-kite-weekender'
const EMAIL = `<table width="600"><tr><td>Hi #FirstName#, <a href="${TICKETS}">get tickets</a>.</td></tr></table>`

let style: HTMLStyleElement
beforeAll(() => {
  style = document.createElement('style')
  style.textContent = roadieCss
  document.head.append(style)
})
afterAll(() => style.remove())

function InField({
  defaultValue = '',
  onValueChange
}: {
  defaultValue?: string
  onValueChange?: (html: string) => void
}) {
  const [html, setHtml] = useState(defaultValue)
  return (
    <Field>
      <Field.Label>{LABEL}</Field.Label>
      <EmailHtmlField
        value={html}
        onValueChange={(next) => {
          setHtml(next)
          onValueChange?.(next)
        }}
      />
      <Field.ErrorText />
    </Field>
  )
}

function paste(target: HTMLElement, data: Record<string, string>) {
  const clipboardData = new DataTransfer()
  for (const [type, value] of Object.entries(data)) {
    clipboardData.setData(type, value)
  }
  const event = new ClipboardEvent('paste', { bubbles: true, cancelable: true })
  // Firefox drops a constructed event's clipboardData; a real paste has it.
  Object.defineProperty(event, 'clipboardData', { value: clipboardData })
  target.focus()
  target.dispatchEvent(event)
}

const source = () =>
  screen.getByRole<HTMLTextAreaElement>('textbox', { name: LABEL })
const preview = () => screen.getByTitle<HTMLIFrameElement>('Email preview')

describe('EmailHtmlField', () => {
  describe('paste', () => {
    it('keeps the HTML on the clipboard, not its text', async () => {
      render(<InField />)
      paste(source(), {
        'text/html': EMAIL,
        'text/plain': 'Hi #FirstName#, get tickets.'
      })
      await expect.poll(() => source().value).toBe(EMAIL)
    })

    it('pastes copied source as it reads, not its highlighting', async () => {
      render(<InField />)
      paste(source(), {
        'text/html': `<pre><span style="color:#800">&lt;table&gt;</span></pre>`,
        'text/plain': EMAIL
      })
      await expect.poll(() => source().value).toBe(EMAIL)
    })

    it('pastes at the caret, replacing the selection', async () => {
      render(<InField defaultValue='<p>Doors open TIME.</p>' />)
      source().setSelectionRange(14, 18)
      paste(source(), { 'text/html': '<b>7pm</b>', 'text/plain': '7pm' })
      await expect
        .poll(() => source().value)
        .toBe('<p>Doors open <b>7pm</b>.</p>')
    })

    it('changes nothing in a read-only field', async () => {
      const onValueChange = vi.fn()
      render(
        <EmailHtmlField
          aria-label={LABEL}
          readOnly
          defaultValue={EMAIL}
          onValueChange={onValueChange}
        />
      )
      paste(source(), { 'text/html': '<b>7pm</b>', 'text/plain': '7pm' })
      expect(source().value).toBe(EMAIL)
      expect(onValueChange).not.toHaveBeenCalled()
    })
  })

  describe('preview', () => {
    it('shows the source in a frame that runs none of its scripts', async () => {
      const ran: unknown[] = []
      const onMessage = (event: MessageEvent) => ran.push(event.data)
      window.addEventListener('message', onMessage)
      // A frame's load waits for its image to fail and its nested frame.
      const loaded = new Promise<void>((resolve) => {
        const onLoad = (event: Event) => {
          if (event.target !== preview()) return
          document.removeEventListener('load', onLoad, true)
          resolve()
        }
        document.addEventListener('load', onLoad, true)
      })
      render(
        <InField
          defaultValue={[
            "<script>parent.postMessage('script', '*')</script>",
            `<img src="/missing.png" onerror="parent.postMessage('handler', '*')">`,
            '<iframe srcdoc="Rendered"></iframe>'
          ].join('')}
        />
      )
      await loaded
      // Messages arrive in order, so the frame's would come before this one.
      await new Promise<void>((resolve) => {
        window.addEventListener('message', function flushed(event) {
          if (event.data !== 'flushed') return
          window.removeEventListener('message', flushed)
          resolve()
        })
        window.postMessage('flushed', '*')
      })
      window.removeEventListener('message', onMessage)
      // The nested frame shows the preview rendered the source.
      expect(preview().contentWindow?.length).toBe(1)
      expect(ran).toEqual(['flushed'])
    })

    it('updates as the source changes', async () => {
      render(<InField />)
      await userEvent.fill(source(), EMAIL)
      expect(preview()).toHaveAttribute('srcdoc', EMAIL)
    })

    it('switches between a 600 pixel email and a phone', async () => {
      render(<InField defaultValue={EMAIL} />)
      expect(preview().getBoundingClientRect().width).toBe(600)
      await userEvent.click(screen.getByRole('button', { name: 'Phone' }))
      expect(preview().getBoundingClientRect().width).toBe(375)
      await userEvent.click(screen.getByRole('button', { name: 'Desktop' }))
      expect(preview().getBoundingClientRect().width).toBe(600)
    })

    it('keeps the email at 600 pixels under a larger root font size', async () => {
      document.documentElement.style.fontSize = '20px'
      try {
        render(<InField defaultValue={EMAIL} />)
        expect(preview().getBoundingClientRect().width).toBe(600)
        await userEvent.click(screen.getByRole('button', { name: 'Phone' }))
        expect(preview().getBoundingClientRect().width).toBe(375)
      } finally {
        document.documentElement.style.fontSize = ''
      }
    })
  })

  describe('warnings', () => {
    it.each([
      ['a script', '<script src="https://example.com/a.js"></script>'],
      ['an onclick attribute', '<a href="#" onClick="track()">Tickets</a>'],
      ['a javascript: link', '<a href=" JavaScript:alert(1)">Tickets</a>'],
      [
        'a script, onload and onerror attributes and a javascript: link',
        '<script></script><body onload="a()"><img onerror="b()"><a href="javascript:c()">x</a>'
      ]
    ])('names %s in Field.ErrorText', async (found, html) => {
      render(<InField defaultValue={html} />)
      expect(await screen.findByRole('alert')).toHaveTextContent(
        `This HTML has ${found}.`
      )
    })

    it('shows none for an email without scripts', async () => {
      render(
        <>
          <InField
            defaultValue={`${EMAIL}<p data-on="click">Say "onclick" or javascript: here.</p>`}
          />
          <EmailHtmlField
            aria-label='Control'
            defaultValue='<script></script>'
          />
        </>
      )
      // The control's warning shows the warnings have run.
      await screen.findByRole('alert')
      expect(screen.getAllByRole('alert')).toHaveLength(1)
    })

    it('never rewrites the HTML it warns about', async () => {
      const onValueChange = vi.fn()
      const html = '<a href="javascript:void(0)" onclick="go()">Go</a>'
      render(<InField onValueChange={onValueChange} />)
      await userEvent.fill(source(), html)
      await waitFor(() => expect(screen.getByRole('alert')).toBeVisible())
      expect(onValueChange).toHaveBeenLastCalledWith(html)
      expect(source().value).toBe(html)
      expect(preview()).toHaveAttribute('srcdoc', html)
    })

    it('shows them under the field outside a Field', async () => {
      render(
        <EmailHtmlField aria-label={LABEL} defaultValue='<script></script>' />
      )
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'This HTML has a script.'
      )
    })
  })
})
