import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Tooltip } from '.'

const positioner = () =>
  document.querySelector('[data-slot="tooltip-positioner"]')
const popup = () => document.querySelector('[data-slot="tooltip-popup"]')

describe('Tooltip', () => {
  it('is the same reference as Tooltip.Root', () => {
    expect(Tooltip).toBe(Tooltip.Root)
  })

  it('renders a strong chip above its trigger by default', async () => {
    render(
      <Tooltip defaultOpen>
        <Tooltip.Trigger>Save</Tooltip.Trigger>
        <Tooltip.Content>Save changes</Tooltip.Content>
      </Tooltip>
    )
    expect(await screen.findByText('Save changes')).toBe(popup())
    expect(popup()).toHaveClass('emphasis-strong', 'text-sm', 'motion-scale')
    expect(popup()).toHaveClass('[--tooltip-surface:var(--intent-bg-strong)]')
    expect(positioner()).toHaveAttribute('data-side', 'top')
    expect(positioner()).toHaveClass('z-tooltip')
  })

  it('takes side directly on Content', async () => {
    render(
      <Tooltip defaultOpen>
        <Tooltip.Trigger>Home</Tooltip.Trigger>
        <Tooltip.Content side='inline-end'>Home page</Tooltip.Content>
      </Tooltip>
    )
    await screen.findByText('Home page')
    expect(positioner()).toHaveAttribute('data-side', 'inline-end')
  })

  it('offers a floating surface', async () => {
    render(
      <Tooltip defaultOpen>
        <Tooltip.Trigger>Help</Tooltip.Trigger>
        <Tooltip.Content emphasis='floating'>Get help</Tooltip.Content>
      </Tooltip>
    )
    await screen.findByText('Get help')
    expect(popup()).toHaveClass(
      'emphasis-floating',
      '[--tooltip-surface:var(--intent-bg-raised)]',
      '[--tooltip-rim:var(--rim-light-edge)]'
    )
  })

  it('paints the arrow from the popup surface and rim', async () => {
    render(
      <Tooltip defaultOpen>
        <Tooltip.Trigger>Help</Tooltip.Trigger>
        <Tooltip.Content>
          <Tooltip.Arrow />
          Get help
        </Tooltip.Content>
      </Tooltip>
    )
    await screen.findByText('Get help')
    expect(
      document.querySelector('[data-slot="tooltip-arrow"] svg')
    ).toHaveClass('fill-(--tooltip-surface)', 'stroke-(--tooltip-rim)')
  })

  it('stays closed until hovered, then opens', async () => {
    const user = userEvent.setup()
    render(
      <Tooltip>
        <Tooltip.Trigger delay={0}>Save</Tooltip.Trigger>
        <Tooltip.Content>Save changes</Tooltip.Content>
      </Tooltip>
    )
    expect(screen.queryByText('Save changes')).not.toBeInTheDocument()
    await user.hover(screen.getByText('Save'))
    expect(await screen.findByText('Save changes')).toBeInTheDocument()
  })

  it('leaves the accessible name to the trigger', async () => {
    render(
      <Tooltip defaultOpen>
        <Tooltip.Trigger aria-label='Edit'>✎</Tooltip.Trigger>
        <Tooltip.Content>Edit</Tooltip.Content>
      </Tooltip>
    )
    const trigger = screen.getByRole('button', { name: 'Edit' })
    expect(trigger).toHaveAttribute('data-slot', 'tooltip-trigger')
    expect(trigger).not.toHaveAttribute('aria-describedby')
  })

  it('groups tooltips under a Provider', () => {
    render(
      <Tooltip.Provider delay={0}>
        <Tooltip>
          <Tooltip.Trigger>One</Tooltip.Trigger>
          <Tooltip.Content>First</Tooltip.Content>
        </Tooltip>
        <Tooltip>
          <Tooltip.Trigger>Two</Tooltip.Trigger>
          <Tooltip.Content>Second</Tooltip.Content>
        </Tooltip>
      </Tooltip.Provider>
    )
    expect(screen.getByRole('button', { name: 'One' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Two' })).toBeInTheDocument()
  })
})
