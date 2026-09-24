import { useState } from 'react'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Collapsible } from '.'
import { disclosureCaretClass } from '../../variants'
import { Accordion } from '../Accordion'
import { Button } from '../Button'

const panel = () => document.querySelector('[data-slot="collapsible-panel"]')
const caret = (trigger: HTMLElement) =>
  trigger.querySelector('[data-slot="collapsible-indicator"]')

function TicketTypes(props: React.ComponentProps<typeof Collapsible>) {
  return (
    <Collapsible {...props}>
      <Collapsible.Trigger>Show all ticket types</Collapsible.Trigger>
      <Collapsible.Panel>Concession</Collapsible.Panel>
    </Collapsible>
  )
}

describe('Collapsible', () => {
  it('is the same reference as Collapsible.Root', () => {
    expect(Collapsible).toBe(Collapsible.Root)
  })

  it('starts closed and opens when the trigger is clicked', async () => {
    const user = userEvent.setup()
    render(<TicketTypes />)
    const trigger = screen.getByRole('button', {
      name: 'Show all ticket types'
    })

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Concession')).not.toBeInTheDocument()

    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(trigger).toHaveAttribute('data-panel-open')
    expect(screen.getByText('Concession')).toBeVisible()
    expect(trigger).toHaveAttribute('aria-controls', panel()?.id)
  })

  it('toggles from the keyboard', async () => {
    const user = userEvent.setup()
    render(<TicketTypes />)
    const trigger = screen.getByRole('button')

    await user.tab()
    expect(trigger).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard(' ')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('animates its panel with the same disclosure motion as Accordion', () => {
    render(<TicketTypes defaultOpen />)
    expect(panel()).toHaveClass('is-disclosure-animated')
  })

  it('shows a trailing caret that turns when open', () => {
    render(<TicketTypes />)
    const trigger = screen.getByRole('button')
    const icon = caret(trigger)
    expect(icon).toHaveClass(
      ...disclosureCaretClass.split(' '),
      'group-data-[panel-open]/collapsible-trigger:rotate-180'
    )
    expect(icon).toHaveAttribute('aria-hidden', 'true')
    expect(trigger).toHaveClass('group/collapsible-trigger')
    expect(trigger.lastElementChild).toBe(icon)
  })

  it('shares its caret motion with Accordion', () => {
    const { container } = render(
      <Accordion>
        <Accordion.Item>
          <Accordion.Trigger>FAQ</Accordion.Trigger>
        </Accordion.Item>
      </Accordion>
    )
    expect(container.querySelector('summary svg')).toHaveClass(
      ...disclosureCaretClass.split(' ')
    )
  })

  it('hides the caret with showIndicator={false}', () => {
    render(
      <Collapsible>
        <Collapsible.Trigger showIndicator={false}>More</Collapsible.Trigger>
      </Collapsible>
    )
    expect(caret(screen.getByRole('button'))).toBeNull()
  })

  it('styles a bare trigger as an interactive text control', () => {
    render(<TicketTypes />)
    expect(screen.getByRole('button')).toHaveClass(
      'is-interactive',
      'inline-flex',
      'font-medium'
    )
  })

  it('renders onto a Roadie Button without its own trigger styles', async () => {
    const user = userEvent.setup()
    render(
      <Collapsible>
        <Collapsible.Trigger render={<Button emphasis='subtler' size='sm' />}>
          Read more
        </Collapsible.Trigger>
        <Collapsible.Panel>The full description</Collapsible.Panel>
      </Collapsible>
    )
    const trigger = screen.getByRole('button', { name: 'Read more' })
    expect(trigger.tagName).toBe('BUTTON')
    expect(trigger).toHaveClass('btn', 'emphasis-subtler', 'btn-sm')
    expect(trigger).not.toHaveClass('font-medium')
    expect(caret(trigger)).not.toBeNull()

    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('The full description')).toBeVisible()
  })

  it('keeps a closed panel in the DOM with keepMounted', () => {
    render(
      <Collapsible>
        <Collapsible.Trigger>Filters</Collapsible.Trigger>
        <Collapsible.Panel keepMounted>Price range</Collapsible.Panel>
      </Collapsible>
    )
    expect(panel()).toHaveAttribute('hidden')
  })

  it('leaves a closed panel findable with hiddenUntilFound', () => {
    render(
      <Collapsible>
        <Collapsible.Trigger>Description</Collapsible.Trigger>
        <Collapsible.Panel hiddenUntilFound>Doors at 7pm</Collapsible.Panel>
      </Collapsible>
    )
    expect(panel()).toHaveAttribute('hidden', 'until-found')
  })

  it('can be controlled', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    function Controlled() {
      const [open, setOpen] = useState(false)
      return (
        <TicketTypes
          open={open}
          onOpenChange={(next) => {
            onOpenChange(next)
            setOpen(next)
          }}
        />
      )
    }
    render(<Controlled />)
    await user.click(screen.getByRole('button'))
    expect(onOpenChange).toHaveBeenCalledWith(true)
    expect(screen.getByText('Concession')).toBeVisible()
  })

  it('does not open when disabled', async () => {
    const user = userEvent.setup()
    render(<TicketTypes disabled />)
    const trigger = screen.getByRole('button')
    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveAttribute('data-disabled')
  })

  it('marks its parts with data-slot', () => {
    const { container } = render(<TicketTypes defaultOpen />)
    expect(container.firstElementChild).toHaveAttribute(
      'data-slot',
      'collapsible'
    )
    expect(screen.getByRole('button')).toHaveAttribute(
      'data-slot',
      'collapsible-trigger'
    )
    expect(panel()).not.toBeNull()
  })
})
