import { StrictMode } from 'react'

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { useStylesheet } from '@oztix/roadie-browser-testing/stylesheet'

import { OTPField } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { hydrateWithoutClock } from '../../utils/testUtils'
import { Field } from '../Field'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

describe('OTPField slots', () => {
  it.each([
    ['sm', 32],
    ['md', 40],
    ['lg', 48]
  ] as const)('are %s squares of %ipx with room to spare', (size, edge) => {
    render(
      <div style={{ width: 600 }}>
        <OTPField length={4} aria-label='Code' size={size} />
      </div>
    )
    for (const slot of screen.getAllByRole('textbox')) {
      const { width, height } = slot.getBoundingClientRect()
      expect(width).toBe(edge)
      expect(height).toBe(edge)
    }
  })

  it('lets one slot override the root size', () => {
    render(
      <div style={{ width: 600 }}>
        <OTPField length={2} aria-label='Code'>
          <OTPField.Input size='lg' />
          <OTPField.Input />
        </OTPField>
      </div>
    )
    const widths = screen
      .getAllByRole('textbox')
      .map((slot) => slot.getBoundingClientRect().width)
    expect(widths).toEqual([48, 40])
  })
})

describe('OTPField autoFocus', () => {
  it('focuses the first slot on mount', () => {
    render(<OTPField length={4} aria-label='Code' autoFocus />)
    expect(document.activeElement).toBe(screen.getAllByRole('textbox')[0])
  })

  it('focuses the first of the slots you compose', () => {
    render(
      <OTPField length={2} aria-label='Code' autoFocus>
        <OTPField.Input />
        <OTPField.Input />
      </OTPField>
    )
    expect(document.activeElement).toBe(screen.getAllByRole('textbox')[0])
  })

  it('leaves focus alone without it', () => {
    render(<OTPField length={4} aria-label='Code' />)
    expect(document.body).toBe(document.activeElement)
  })

  it('moves to the next slot as the code is typed', async () => {
    const user = userEvent.setup()
    render(<OTPField length={4} aria-label='Code' autoFocus />)
    await user.keyboard('1')
    expect(document.activeElement).toBe(screen.getAllByRole('textbox')[1])
  })

  it('focuses the first slot inside Field', () => {
    render(
      <Field>
        <Field.Label>Code</Field.Label>
        <OTPField length={4} autoFocus />
      </Field>
    )
    expect(document.activeElement).toBe(screen.getAllByRole('textbox')[0])
  })

  it('still focuses the first slot under StrictMode', () => {
    render(
      <StrictMode>
        <OTPField length={4} aria-label='Code' autoFocus />
      </StrictMode>
    )
    expect(document.activeElement).toBe(screen.getAllByRole('textbox')[0])
  })

  // React leaves focus on hydrated markup to the browser's native autofocus,
  // so the server HTML must carry exactly one autofocus, on the first slot.
  it('server renders autofocus on the first slot only and hydrates cleanly', async () => {
    const { container, serverHtml, onRecoverableError } =
      await hydrateWithoutClock(
        <OTPField length={4} aria-label='Code' autoFocus />
      )
    expect(serverHtml.match(/autofocus/g)).toHaveLength(1)
    expect(container.querySelector('input')).toHaveAttribute('autofocus')
    expect(onRecoverableError).not.toHaveBeenCalled()
  })

  it('keeps an autoFocus set on a slot you compose', () => {
    render(
      <OTPField length={2} aria-label='Code'>
        <OTPField.Input />
        <OTPField.Input autoFocus />
      </OTPField>
    )
    expect(document.activeElement).toBe(screen.getAllByRole('textbox')[1])
  })

  it('lets a composed first slot opt out with autoFocus false', () => {
    render(
      <OTPField length={2} aria-label='Code' autoFocus>
        <OTPField.Input autoFocus={false} />
        <OTPField.Input />
      </OTPField>
    )
    expect(document.body).toBe(document.activeElement)
  })
})
