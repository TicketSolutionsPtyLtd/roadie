import { useState } from 'react'

import { render, screen } from '@testing-library/react'
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
    const { container } = render(<Collapsible.Text>{DETAILS}</Collapsible.Text>)
    const root = container.firstElementChild!
    expect(root.tagName).toBe('P')
    expect(root).toHaveAttribute('data-slot', 'collapsible-text')
    expect(content()).toHaveTextContent(DETAILS)
  })

  it('clamps to three lines by default', () => {
    render(<Collapsible.Text>{DETAILS}</Collapsible.Text>)
    expect(content()).toHaveAttribute('data-clamped')
    expect(content().style.getPropertyValue('--collapsible-lines')).toBe('3')
  })

  it('clamps to the lines passed', () => {
    render(<Collapsible.Text lines={2}>{DETAILS}</Collapsible.Text>)
    expect(content().style.getPropertyValue('--collapsible-lines')).toBe('2')
  })

  it('shows no trigger and no fade when the text fits', () => {
    mockHeights(48, 48)
    render(<Collapsible.Text>{DETAILS}</Collapsible.Text>)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(content()).not.toHaveAttribute('data-overflowing')
  })

  it('shows an inline …more trigger when the text overflows', () => {
    overflowing()
    render(<Collapsible.Text>{DETAILS}</Collapsible.Text>)
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
    render(<Collapsible.Text>{DETAILS}</Collapsible.Text>)
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
      <Collapsible.Text moreLabel='details' lessLabel='Hide details'>
        {DETAILS}
      </Collapsible.Text>
    )
    await user.click(screen.getByRole('button', { name: 'details' }))
    expect(screen.getByRole('button')).toHaveAccessibleName('Hide details')
  })

  it('only expands with lessLabel={null}, moving focus to the text', async () => {
    overflowing()
    const user = userEvent.setup()
    render(<Collapsible.Text lessLabel={null}>{DETAILS}</Collapsible.Text>)

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
        <Collapsible.Text
          open={open}
          onOpenChange={(next) => {
            onOpenChange(next)
            setOpen(next)
          }}
        >
          {DETAILS}
        </Collapsible.Text>
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
    render(<Collapsible.Text defaultOpen>{DETAILS}</Collapsible.Text>)
    expect(content()).not.toHaveAttribute('data-clamped')
    expect(screen.getByRole('button')).toHaveAccessibleName('Show less')
  })

  it('renders another element through render, keeping className', () => {
    const { container } = render(
      <Collapsible.Text render={<div />} className='text-sm'>
        {DETAILS}
      </Collapsible.Text>
    )
    const root = container.firstElementChild!
    expect(root.tagName).toBe('DIV')
    expect(root).toHaveClass('text-sm', 'relative')
    expect(content().tagName).toBe('DIV')
  })
})
