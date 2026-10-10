import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Collapsible } from '.'

const DETAILS =
  'Entry to Iguana Teapot Hall in Fitzroy for one person, standing only. Doors open at 7pm and the support act starts at 8pm.'

const content = () =>
  document.querySelector<HTMLElement>('[data-slot="collapsible-text-content"]')!

afterEach(() => vi.restoreAllMocks())

describe('Collapsible.Text', () => {
  it('renders a paragraph with the whole text in the DOM', () => {
    render(
      <Collapsible>
        <Collapsible.Text>{DETAILS}</Collapsible.Text>
      </Collapsible>
    )
    const root = document.querySelector('[data-slot="collapsible-text"]')!
    expect(root.tagName).toBe('P')
    expect(root).toHaveAttribute('data-slot', 'collapsible-text')
    expect(content()).toHaveTextContent(DETAILS)
  })

  it('clamps to three lines by default', () => {
    render(
      <Collapsible>
        <Collapsible.Text>{DETAILS}</Collapsible.Text>
      </Collapsible>
    )
    expect(content()).toHaveAttribute('data-clamped')
    expect(content().style.getPropertyValue('--collapsible-lines')).toBe('3')
  })

  it('clamps to the lines passed', () => {
    render(
      <Collapsible>
        <Collapsible.Text lines={2}>{DETAILS}</Collapsible.Text>
      </Collapsible>
    )
    expect(content().style.getPropertyValue('--collapsible-lines')).toBe('2')
  })

  it('renders another element through render, keeping className', () => {
    render(
      <Collapsible>
        <Collapsible.Text render={<div />} className='text-sm'>
          {DETAILS}
        </Collapsible.Text>
      </Collapsible>
    )
    const root = document.querySelector('[data-slot="collapsible-text"]')!
    expect(root.tagName).toBe('DIV')
    expect(root).toHaveClass('text-sm', 'relative')
    expect(content().tagName).toBe('DIV')
  })

  it('throws outside a Collapsible', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() =>
      render(<Collapsible.Text>{DETAILS}</Collapsible.Text>)
    ).toThrow('Collapsible.Text must be used inside <Collapsible>.')
  })

  it('uses an inline wrapper inside an opaque render so a <p> stays valid', () => {
    render(
      <Collapsible>
        <Collapsible.Text render={(props) => <p {...props} />}>
          {DETAILS}
        </Collapsible.Text>
      </Collapsible>
    )
    expect(content().tagName).toBe('SPAN')
    expect(document.querySelector('p div')).toBeNull()
  })
})
