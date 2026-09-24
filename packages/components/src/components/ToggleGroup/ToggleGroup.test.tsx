import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ToggleGroup, type ToggleGroupProps } from '.'

const indicator = () =>
  document.querySelector('[data-slot="toggle-group-indicator"]')

function DateRange(props: ToggleGroupProps) {
  return (
    <ToggleGroup aria-label='Date range' defaultValue={['30d']} {...props}>
      <ToggleGroup.Item value='7d'>7 days</ToggleGroup.Item>
      <ToggleGroup.Item value='30d'>30 days</ToggleGroup.Item>
      <ToggleGroup.Item value='90d'>90 days</ToggleGroup.Item>
    </ToggleGroup>
  )
}

describe('ToggleGroup', () => {
  it('is the same reference as ToggleGroup.Root', () => {
    expect(ToggleGroup).toBe(ToggleGroup.Root)
  })

  it('renders a sunken segmented track', () => {
    render(<DateRange />)
    const group = screen.getByRole('group', { name: 'Date range' })
    expect(group).toHaveAttribute('data-slot', 'toggle-group')
    expect(group).toHaveClass('emphasis-sunken', 'rounded-full')
    expect(group).toHaveAttribute('data-orientation', 'horizontal')
  })

  it('marks the default value pressed', () => {
    render(<DateRange />)
    expect(screen.getByRole('button', { name: '30 days' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByRole('button', { name: '7 days' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
  })

  it('moves the single selection on click', async () => {
    const onValueChange = vi.fn()
    const user = userEvent.setup()
    render(<DateRange onValueChange={onValueChange} />)
    await user.click(screen.getByRole('button', { name: '7 days' }))
    expect(onValueChange).toHaveBeenCalledWith(['7d'], expect.anything())
    expect(screen.getByRole('button', { name: '7 days' })).toHaveAttribute(
      'data-pressed'
    )
    expect(screen.getByRole('button', { name: '30 days' })).not.toHaveAttribute(
      'data-pressed'
    )
  })

  it('keeps the selection when the pressed item is clicked again', async () => {
    const onValueChange = vi.fn()
    const user = userEvent.setup()
    render(<DateRange onValueChange={onValueChange} />)
    await user.click(screen.getByRole('button', { name: '30 days' }))
    expect(onValueChange).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: '30 days' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })

  it('lets multiple items be pressed and all be cleared', async () => {
    const user = userEvent.setup()
    render(
      <ToggleGroup multiple aria-label='Text style'>
        <ToggleGroup.Item value='bold'>Bold</ToggleGroup.Item>
        <ToggleGroup.Item value='italic'>Italic</ToggleGroup.Item>
      </ToggleGroup>
    )
    const bold = screen.getByRole('button', { name: 'Bold' })
    const italic = screen.getByRole('button', { name: 'Italic' })
    await user.click(bold)
    await user.click(italic)
    expect(bold).toHaveAttribute('aria-pressed', 'true')
    expect(italic).toHaveAttribute('aria-pressed', 'true')
    await user.click(bold)
    expect(bold).toHaveAttribute('aria-pressed', 'false')
  })

  it('slides one indicator in single mode', () => {
    render(<DateRange />)
    expect(indicator()).toHaveClass(
      'emphasis-raised',
      'transition-[left,top,width,height]'
    )
    expect(indicator()).toHaveAttribute('data-ready')
    expect(screen.getByRole('button', { name: '30 days' })).not.toHaveClass(
      'data-[pressed]:emphasis-raised'
    )
  })

  it('raises each pressed item itself when multiple', () => {
    render(
      <ToggleGroup multiple aria-label='Text style'>
        <ToggleGroup.Item value='bold'>Bold</ToggleGroup.Item>
      </ToggleGroup>
    )
    expect(indicator()).toBeNull()
    expect(screen.getByRole('button', { name: 'Bold' })).toHaveClass(
      'data-[pressed]:emphasis-raised'
    )
  })

  it('hides the indicator when nothing is pressed', () => {
    render(<DateRange defaultValue={[]} />)
    expect(indicator()).not.toHaveAttribute('data-ready')
  })

  it('moves focus with arrow keys', async () => {
    const user = userEvent.setup()
    render(<DateRange />)
    await user.tab()
    expect(screen.getByRole('button', { name: '7 days' })).toHaveFocus()
    await user.keyboard('{ArrowRight}{ArrowRight}')
    expect(screen.getByRole('button', { name: '90 days' })).toHaveFocus()
    await user.keyboard(' ')
    expect(screen.getByRole('button', { name: '90 days' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })

  it('sizes items to match Button heights', () => {
    const { rerender } = render(<DateRange size='sm' />)
    expect(screen.getByRole('button', { name: '7 days' })).toHaveClass('h-6')
    rerender(<DateRange />)
    expect(screen.getByRole('button', { name: '7 days' })).toHaveClass('h-8')
    rerender(<DateRange size='lg' />)
    expect(screen.getByRole('button', { name: '7 days' })).toHaveClass('h-10')
  })

  it('maps direction to orientation', () => {
    render(<DateRange direction='vertical' />)
    expect(screen.getByRole('group')).toHaveAttribute(
      'data-orientation',
      'vertical'
    )
  })

  it('disables every item', async () => {
    const user = userEvent.setup()
    render(<DateRange disabled />)
    const item = screen.getByRole('button', { name: '7 days' })
    expect(item).toHaveAttribute('data-disabled')
    await user.click(item)
    expect(item).toHaveAttribute('aria-pressed', 'false')
  })

  it('names icon-only items with aria-label', () => {
    render(
      <ToggleGroup aria-label='View' defaultValue={['list']}>
        <ToggleGroup.Item value='list' aria-label='List'>
          <svg />
        </ToggleGroup.Item>
      </ToggleGroup>
    )
    const item = screen.getByRole('button', { name: 'List' })
    expect(item).toHaveAttribute('data-slot', 'toggle-group-item')
  })

  it('applies an intent class to the track', () => {
    render(<DateRange intent='accent' />)
    expect(screen.getByRole('group')).toHaveClass('intent-accent')
  })
})
