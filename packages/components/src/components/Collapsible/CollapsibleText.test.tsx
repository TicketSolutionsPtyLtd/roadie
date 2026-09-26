import { useState } from 'react'

import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Collapsible } from '.'

const DETAILS =
  'Entry to the Paper Lantern Hall in Fitzroy for one person, standing only. Doors open at 7pm and the support act starts at 8pm.'

const content = () =>
  document.querySelector<HTMLElement>('[data-slot="collapsible-text-content"]')!

function mockHeights(scrollHeight: number, clientHeight: number) {
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(
    function (this: HTMLElement) {
      return this.dataset.slot === 'collapsible-text-content' ? scrollHeight : 0
    }
  )
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(
    function (this: HTMLElement) {
      return this.dataset.slot === 'collapsible-text-content' ? clientHeight : 0
    }
  )
}

const overflowing = () => mockHeights(120, 72)

afterEach(() => vi.restoreAllMocks())

describe('Collapsible.Text', () => {
  it('renders a paragraph with the whole text in the DOM', () => {
    overflowing()
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

  it('shows no trigger and no fade when the text fits', () => {
    mockHeights(48, 48)
    render(
      <Collapsible>
        <Collapsible.Text>{DETAILS}</Collapsible.Text>
      </Collapsible>
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(content()).not.toHaveAttribute('data-overflowing')
  })

  it('shows an inline …more trigger when the text overflows', () => {
    overflowing()
    render(
      <Collapsible>
        <Collapsible.Text>{DETAILS}</Collapsible.Text>
      </Collapsible>
    )
    const trigger = screen.getByRole('button', { name: 'more' })
    expect(trigger).toHaveTextContent('…more')
    expect(trigger.querySelector('[aria-hidden="true"]')).toHaveTextContent('…')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveAttribute('aria-controls', content().id)
    expect(trigger).toHaveClass('text-strong', 'font-medium')
    expect(content()).toHaveAttribute('data-overflowing')
  })

  it('expands and collapses, keeping focus on the trigger', async () => {
    overflowing()
    const user = userEvent.setup()
    render(
      <Collapsible>
        <Collapsible.Text>{DETAILS}</Collapsible.Text>
      </Collapsible>
    )
    const trigger = screen.getByRole('button', { name: 'more' })

    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(trigger).toHaveAccessibleName('Show less')
    expect(trigger).toHaveFocus()
    expect(content()).not.toHaveAttribute('data-clamped')

    await user.keyboard('{Enter}')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveAccessibleName('more')
    expect(trigger).toHaveFocus()
    expect(content()).toHaveAttribute('data-clamped')
  })

  it('takes custom labels', async () => {
    overflowing()
    const user = userEvent.setup()
    render(
      <Collapsible>
        <Collapsible.Text moreLabel='details' lessLabel='Hide details'>
          {DETAILS}
        </Collapsible.Text>
      </Collapsible>
    )
    await user.click(screen.getByRole('button', { name: 'details' }))
    expect(screen.getByRole('button')).toHaveAccessibleName('Hide details')
  })

  it('only expands with lessLabel={null}, moving focus to the text', async () => {
    overflowing()
    const user = userEvent.setup()
    render(
      <Collapsible>
        <Collapsible.Text lessLabel={null}>{DETAILS}</Collapsible.Text>
      </Collapsible>
    )

    await user.click(screen.getByRole('button', { name: 'more' }))
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(content()).not.toHaveAttribute('data-clamped')
    expect(content()).toHaveFocus()
  })

  it('can be controlled', async () => {
    overflowing()
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    function Controlled() {
      const [open, setOpen] = useState(false)
      return (
        <Collapsible
          open={open}
          onOpenChange={(next) => {
            onOpenChange(next)
            setOpen(next)
          }}
        >
          <Collapsible.Text>{DETAILS}</Collapsible.Text>
        </Collapsible>
      )
    }
    render(<Controlled />)
    await user.click(screen.getByRole('button'))
    expect(onOpenChange).toHaveBeenCalledWith(true)
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true')
  })

  it('starts open with defaultOpen', () => {
    overflowing()
    const computed = window.getComputedStyle
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
      const style = computed(element)
      Object.defineProperty(style, 'lineHeight', { value: '24px' })
      return style
    })
    render(
      <Collapsible defaultOpen>
        <Collapsible.Text>{DETAILS}</Collapsible.Text>
      </Collapsible>
    )
    expect(content()).not.toHaveAttribute('data-clamped')
    expect(screen.getByRole('button')).toHaveAccessibleName('Show less')
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

  it('leaves focus alone when something else opens it', () => {
    overflowing()
    function Opener() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type='button' onClick={() => setOpen(true)}>
            Open
          </button>
          <Collapsible open={open}>
            <Collapsible.Text lessLabel={null}>{DETAILS}</Collapsible.Text>
          </Collapsible>
        </>
      )
    }
    render(<Opener />)
    const opener = screen.getByRole('button', { name: 'Open' })
    opener.focus()
    act(() => opener.click())
    expect(content()).not.toHaveAttribute('data-clamped')
    expect(opener).toHaveFocus()
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
