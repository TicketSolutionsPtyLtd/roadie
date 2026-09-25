import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Switch, switchVariants } from '.'
import { Field } from '../Field'

describe('Switch', () => {
  it('Switch and Switch.Root are the same component reference', () => {
    expect(Switch).toBe(Switch.Root)
  })

  it('renders a switch with a thumb', () => {
    render(<Switch aria-label='Dark mode' />)
    const control = screen.getByRole('switch', { name: 'Dark mode' })
    expect(control).toHaveAttribute('data-slot', 'switch')
    expect(control.querySelector('[data-slot="switch-thumb"]')).toBeTruthy()
  })

  it('toggles on click and reports the new state', async () => {
    const onCheckedChange = vi.fn()
    render(<Switch aria-label='Dark mode' onCheckedChange={onCheckedChange} />)
    const control = screen.getByRole('switch')
    expect(control).toHaveAttribute('aria-checked', 'false')
    await userEvent.click(control)
    expect(control).toHaveAttribute('aria-checked', 'true')
    expect(control).toHaveAttribute('data-checked')
    expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything())
  })

  it('shows a decorative tick only when checked', async () => {
    render(<Switch aria-label='Dark mode' />)
    const control = screen.getByRole('switch')
    const tick = control.querySelector('[data-slot="switch-tick"]')
    expect(tick).toHaveAttribute('aria-hidden', 'true')
    expect(tick).toHaveClass(
      'opacity-0',
      'group-data-checked/track:opacity-100'
    )
    expect(control).not.toHaveAttribute('data-checked')
    await userEvent.click(control)
    expect(control).toHaveAttribute('data-checked')
    expect(control).toHaveClass('group/track')
  })

  it('toggles with the keyboard', async () => {
    render(<Switch aria-label='Dark mode' />)
    const control = screen.getByRole('switch')
    await userEvent.tab()
    expect(control).toHaveFocus()
    await userEvent.keyboard(' ')
    expect(control).toHaveAttribute('aria-checked', 'true')
    await userEvent.keyboard('{Enter}')
    expect(control).toHaveAttribute('aria-checked', 'false')
  })

  it('names the switch from the label prop and toggles from the label', async () => {
    render(<Switch label='Email me when tickets go on sale' />)
    const control = screen.getByRole('switch', {
      name: 'Email me when tickets go on sale'
    })
    await userEvent.click(screen.getByText('Email me when tickets go on sale'))
    expect(control).toHaveAttribute('aria-checked', 'true')
  })

  it('describes the switch from the description prop', () => {
    render(
      <Switch
        label='Presale alerts'
        description='We send one email per event.'
      />
    )
    expect(
      screen.getByRole('switch', { name: 'Presale alerts' })
    ).toHaveAccessibleDescription('We send one email per event.')
  })

  it('renders a description passed without a label', () => {
    render(
      <Switch aria-label='Presale alerts' description='One email per event.' />
    )
    expect(
      screen.getByRole('switch', { name: 'Presale alerts' })
    ).toHaveAccessibleDescription('One email per event.')
  })

  it('treats 0 as a label and description', () => {
    render(<Switch label={0} description={0} />)
    const control = screen.getByRole('switch', { name: '0' })
    expect(control).toHaveAccessibleDescription('0')
  })

  it('does not toggle when disabled', async () => {
    render(<Switch label='Presale alerts' disabled />)
    const control = screen.getByRole('switch')
    await userEvent.click(control)
    expect(control).toHaveAttribute('aria-checked', 'false')
    expect(control).toHaveAttribute('data-disabled')
  })

  it('checked track is accent', () => {
    expect(switchVariants()).toContain(
      'data-checked:bg-[var(--color-accent-9)]'
    )
  })

  it('defaults to md and accepts sm', () => {
    expect(switchVariants()).toContain('h-6')
    expect(switchVariants({ size: 'sm' })).toContain('h-5')
  })

  it('marks the switch invalid', () => {
    render(<Switch aria-label='Terms' invalid />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-invalid', 'true')
  })

  it('submits its value with a form', () => {
    const { container } = render(
      <form>
        <Switch aria-label='Presale alerts' name='presale' defaultChecked />
      </form>
    )
    const form = container.querySelector('form')!
    expect(new FormData(form).get('presale')).toBe('on')
  })

  it('puts className on the outer label row', () => {
    const { container } = render(
      <Switch label='Presale alerts' className='custom-row' />
    )
    expect(container.firstElementChild).toHaveClass('custom-row')
  })
})

describe('Field + Switch integration', () => {
  it('takes its name from Field.Label', () => {
    render(
      <Field>
        <Field.Label>Presale alerts</Field.Label>
        <Switch />
      </Field>
    )
    expect(
      screen.getByRole('switch', { name: 'Presale alerts' })
    ).toBeInTheDocument()
  })

  it('toggles when Field.Label is clicked', () => {
    render(
      <Field>
        <Field.Label>Presale alerts</Field.Label>
        <Switch />
      </Field>
    )
    fireEvent.click(screen.getByText('Presale alerts'))
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('inherits invalid, required and disabled from Field', () => {
    render(
      <Field invalid required disabled>
        <Switch label='I accept the terms' />
        <Field.ErrorText>Accept the terms to continue</Field.ErrorText>
      </Field>
    )
    const control = screen.getByRole('switch')
    expect(control).toHaveAttribute('aria-invalid', 'true')
    expect(control).toHaveAttribute('aria-required', 'true')
    expect(control).toHaveAttribute('data-disabled')
    expect(control).toHaveAccessibleDescription('Accept the terms to continue')
  })

  it('props override Field context', () => {
    render(
      <Field invalid>
        <Switch label='I accept the terms' invalid={false} />
      </Field>
    )
    expect(screen.getByRole('switch')).not.toHaveAttribute('aria-invalid')
  })
})
