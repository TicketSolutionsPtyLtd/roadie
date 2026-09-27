import { act, fireEvent, render, screen } from '@testing-library/react'
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

  it('renders a bordered segmented track', () => {
    render(<DateRange />)
    const group = screen.getByRole('group', { name: 'Date range' })
    expect(group).toHaveAttribute('data-slot', 'toggle-group')
    expect(group).toHaveClass('emphasis-normal', 'rounded-full')
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
      'emphasis-strong',
      'transition-[left,top,width,height]'
    )
    expect(indicator()).toHaveAttribute('data-ready')
    expect(screen.getByRole('button', { name: '30 days' })).not.toHaveClass(
      'data-[pressed]:emphasis-strong'
    )
  })

  it('fills each pressed item itself when multiple', () => {
    render(
      <ToggleGroup multiple aria-label='Text style'>
        <ToggleGroup.Item value='bold'>Bold</ToggleGroup.Item>
      </ToggleGroup>
    )
    expect(indicator()).toBeNull()
    expect(screen.getByRole('button', { name: 'Bold' })).toHaveClass(
      'data-[pressed]:emphasis-strong'
    )
  })

  it.each([
    ['normal', 'emphasis-normal', 'emphasis-strong', 'text-on-strong'],
    ['subtle', 'emphasis-subtle', 'emphasis-strong', 'text-on-strong'],
    ['subtler', 'border', 'emphasis-subtle', 'text-strong']
  ] as const)(
    'gives a %s group a %s track, a %s pill and %s pressed text',
    (emphasis, track, pill, text) => {
      render(<DateRange emphasis={emphasis} />)
      expect(screen.getByRole('group', { name: 'Date range' })).toHaveClass(
        track,
        'p-0.75'
      )
      expect(indicator()).toHaveClass(pill)
      expect(screen.getByRole('button', { name: '30 days' })).toHaveClass(
        `data-[pressed]:${text}`
      )
      render(
        <ToggleGroup multiple emphasis={emphasis} aria-label='Text style'>
          <ToggleGroup.Item value='bold'>Bold</ToggleGroup.Item>
        </ToggleGroup>
      )
      expect(screen.getByRole('button', { name: 'Bold' })).toHaveClass(
        `data-[pressed]:${pill}`
      )
    }
  )

  it('defaults to normal', () => {
    render(<DateRange />)
    expect(screen.getByRole('group')).toHaveClass('emphasis-normal')
    expect(indicator()).toHaveClass('emphasis-strong')
  })

  it('has no track at subtler', () => {
    render(<DateRange emphasis='subtler' />)
    expect(screen.getByRole('group')).not.toHaveClass('emphasis-subtle')
  })

  it('hides the indicator when nothing is pressed', () => {
    render(<DateRange defaultValue={[]} />)
    expect(indicator()).not.toHaveAttribute('data-ready')
  })

  it('tabs onto the pressed item, then moves with arrow keys', async () => {
    const user = userEvent.setup()
    render(
      <>
        <button type='button'>Before</button>
        <DateRange />
        <button type='button'>After</button>
      </>
    )
    await user.tab()
    await user.tab()
    expect(screen.getByRole('button', { name: '30 days' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: '90 days' })).toHaveFocus()
    await user.keyboard(' ')
    expect(screen.getByRole('button', { name: '90 days' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    await user.tab()
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: '90 days' })).toHaveFocus()
  })

  it('keeps focus on an unpressed item when the window regains focus', async () => {
    const user = userEvent.setup()
    render(<DateRange />)
    await user.tab()
    await user.keyboard('{ArrowRight}')
    const unpressed = screen.getByRole('button', { name: '90 days' })
    expect(unpressed).toHaveFocus()
    fireEvent.focusOut(unpressed, { relatedTarget: null })
    fireEvent.focusIn(unpressed, { relatedTarget: null })
    expect(unpressed).toHaveFocus()
  })

  it('lands on the pressed item again after a window return and a tab out', async () => {
    const user = userEvent.setup()
    render(
      <>
        <DateRange />
        <button type='button'>After</button>
      </>
    )
    await user.tab()
    await user.keyboard('{ArrowRight}')
    const unpressed = screen.getByRole('button', { name: '90 days' })
    fireEvent.focusOut(unpressed, { relatedTarget: null })
    fireEvent.focusIn(unpressed, { relatedTarget: null })
    await user.tab()
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: '30 days' })).toHaveFocus()
  })

  it('treats a blur whose focus already left the group as leaving', async () => {
    const user = userEvent.setup()
    render(
      <>
        <DateRange />
        <button type='button'>After</button>
      </>
    )
    await user.tab()
    await user.keyboard('{ArrowRight}')
    const unpressed = screen.getByRole('button', { name: '90 days' })
    act(() => screen.getByRole('button', { name: 'After' }).focus())
    fireEvent.focusOut(unpressed, { relatedTarget: null })
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: '30 days' })).toHaveFocus()
  })

  it('forgets a window blur once focus lands outside the group', async () => {
    const user = userEvent.setup()
    render(
      <>
        <DateRange />
        <button type='button'>After</button>
      </>
    )
    await user.tab()
    await user.keyboard('{ArrowRight}')
    const unpressed = screen.getByRole('button', { name: '90 days' })
    fireEvent.focusOut(unpressed, { relatedTarget: null })
    fireEvent.focusIn(screen.getByRole('button', { name: 'After' }))
    fireEvent.focusIn(unpressed, { relatedTarget: null })
    expect(screen.getByRole('button', { name: '30 days' })).toHaveFocus()
  })

  it('stops watching for a window return when it unmounts', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<DateRange />)
    await user.tab()
    const add = vi.spyOn(document, 'addEventListener')
    const remove = vi.spyOn(document, 'removeEventListener')
    fireEvent.focusOut(screen.getByRole('button', { name: '30 days' }), {
      relatedTarget: null
    })
    const watcher = add.mock.calls.find(([type]) => type === 'focusin')?.[1]
    expect(watcher).toBeDefined()
    unmount()
    expect(remove).toHaveBeenCalledWith('focusin', watcher, true)
    add.mockRestore()
    remove.mockRestore()
  })

  it('keeps one window return watcher across repeated blurs', async () => {
    const user = userEvent.setup()
    render(<DateRange />)
    await user.tab()
    const item = screen.getByRole('button', { name: '30 days' })
    const add = vi.spyOn(document, 'addEventListener')
    const remove = vi.spyOn(document, 'removeEventListener')
    fireEvent.focusOut(item, { relatedTarget: null })
    const first = add.mock.calls.find(([type]) => type === 'focusin')?.[1]
    fireEvent.focusOut(item, { relatedTarget: null })
    expect(remove).toHaveBeenCalledWith('focusin', first, true)
    add.mockRestore()
    remove.mockRestore()
  })

  it('tabs onto the first item when nothing is pressed', async () => {
    const user = userEvent.setup()
    render(<DateRange defaultValue={[]} />)
    await user.tab()
    expect(screen.getByRole('button', { name: '7 days' })).toHaveFocus()
  })

  it('leaves focus on the clicked item', async () => {
    const user = userEvent.setup()
    render(<DateRange />)
    await user.click(screen.getByRole('button', { name: '7 days' }))
    expect(screen.getByRole('button', { name: '7 days' })).toHaveFocus()
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

  it('squares an item that holds only an icon', () => {
    render(
      <ToggleGroup aria-label='View' defaultValue={['list']}>
        <ToggleGroup.Item value='list' aria-label='List'>
          <svg />
        </ToggleGroup.Item>
        <ToggleGroup.Item value='7d' aria-label='Last 7 days'>
          7d
        </ToggleGroup.Item>
        <ToggleGroup.Item value='grid'>
          <svg />
          Grid
        </ToggleGroup.Item>
      </ToggleGroup>
    )
    expect(screen.getByRole('button', { name: 'List' })).toHaveAttribute(
      'data-icon-only'
    )
    expect(
      screen.getByRole('button', { name: 'Last 7 days' })
    ).not.toHaveAttribute('data-icon-only')
    expect(screen.getByRole('button', { name: 'Grid' })).not.toHaveAttribute(
      'data-icon-only'
    )
  })

  it('applies an intent class to the track', () => {
    render(<DateRange intent='accent' />)
    expect(screen.getByRole('group')).toHaveClass('intent-accent')
  })

  it('keeps a non-button item focusable and pressable by keyboard', async () => {
    const user = userEvent.setup()
    const warn = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ToggleGroup aria-label='View' defaultValue={['list']}>
        <ToggleGroup.Item value='list'>List</ToggleGroup.Item>
        <ToggleGroup.Item value='grid' render={<div />}>
          Grid
        </ToggleGroup.Item>
      </ToggleGroup>
    )
    const grid = screen.getByRole('button', { name: 'Grid' })
    expect(grid.tagName).toBe('DIV')
    await user.tab()
    await user.keyboard('{ArrowRight}')
    expect(grid).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(grid).toHaveAttribute('aria-pressed', 'true')
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
