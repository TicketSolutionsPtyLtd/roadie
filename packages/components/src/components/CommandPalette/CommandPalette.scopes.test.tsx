import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { CommandPalette, type CommandPaletteProps } from '.'

type Command = { label: string; scope?: string }
type Group = { label: string; scope?: string; items: Command[] }

const GROUPS: Group[] = [
  {
    label: 'Sessions',
    scope: 'sessions',
    items: [{ label: 'Calendar agenda' }, { label: 'RecordBoard' }]
  },
  {
    label: 'Recent',
    items: [
      { label: 'Release notes', scope: 'artifacts' },
      { label: 'Backlog review', scope: 'sessions' }
    ]
  }
]

function Palette({
  withScopes = true,
  ...props
}: Partial<CommandPaletteProps<Group>> & { withScopes?: boolean }) {
  return (
    <CommandPalette defaultOpen shortcut={false} items={GROUPS} {...props}>
      <CommandPalette.Input />
      {withScopes && (
        <CommandPalette.Scopes>
          <CommandPalette.Scope value='artifacts'>
            Artifacts
          </CommandPalette.Scope>
          <CommandPalette.Scope value='sessions'>Sessions</CommandPalette.Scope>
        </CommandPalette.Scopes>
      )}
      <CommandPalette.List>
        {(group: Group) => (
          <CommandPalette.Group key={group.label} items={group.items}>
            <CommandPalette.GroupLabel>{group.label}</CommandPalette.GroupLabel>
            <CommandPalette.Collection>
              {(command: Command) => (
                <CommandPalette.Item key={command.label} value={command}>
                  {command.label}
                </CommandPalette.Item>
              )}
            </CommandPalette.Collection>
          </CommandPalette.Group>
        )}
      </CommandPalette.List>
      <CommandPalette.Footer>
        <CommandPalette.Hint shortcut={['escape']}>Close</CommandPalette.Hint>
        <CommandPalette.Hint shortcut={['arrowleft', 'arrowright']}>
          Change type
        </CommandPalette.Hint>
      </CommandPalette.Footer>
    </CommandPalette>
  )
}

const options = () =>
  screen.queryAllByRole('option').map((option) => option.textContent)
const tab = (name: string) => screen.getByRole('button', { name })

describe('CommandPalette scopes', () => {
  it('shows every command under All, the first tab', async () => {
    render(<Palette />)
    expect(await screen.findAllByRole('option')).toHaveLength(4)
    expect(tab('All')).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows only the commands of the chosen type, from groups and items', async () => {
    render(<Palette />)
    await userEvent.click(
      await screen.findByRole('button', { name: 'Sessions' })
    )
    expect(options()).toEqual([
      'Calendar agenda',
      'RecordBoard',
      'Backlog review'
    ])
    await userEvent.click(tab('Artifacts'))
    expect(options()).toEqual(['Release notes'])
  })

  it('narrows server results by type with filter={null}, matching nothing itself', async () => {
    render(<Palette filter={null} />)
    await userEvent.type(await screen.findByRole('combobox'), 'zzz')
    expect(options()).toHaveLength(4)
    await userEvent.click(tab('Sessions'))
    expect(options()).toEqual([
      'Calendar agenda',
      'RecordBoard',
      'Backlog review'
    ])
  })

  it('moves between types with the arrows from an empty input', async () => {
    render(<Palette />)
    const input = await screen.findByRole('combobox')
    input.focus()
    await userEvent.keyboard('{ArrowLeft}')
    expect(tab('All')).toHaveAttribute('aria-pressed', 'true')
    expect(options()).toHaveLength(4)
    await userEvent.keyboard('{ArrowRight}')
    expect(tab('Artifacts')).toHaveAttribute('aria-pressed', 'true')
    await userEvent.keyboard('{ArrowRight}{ArrowRight}')
    expect(tab('Sessions')).toHaveAttribute('aria-pressed', 'true')
    await userEvent.keyboard('{ArrowLeft}')
    expect(tab('Artifacts')).toHaveAttribute('aria-pressed', 'true')
    expect(input).toHaveFocus()
  })

  it('leaves the arrows to the caret inside typed text', async () => {
    render(<Palette />)
    const input = await screen.findByRole('combobox')
    input.focus()
    await userEvent.keyboard('{ArrowRight}re{ArrowLeft}')
    expect(tab('Artifacts')).toHaveAttribute('aria-pressed', 'true')
    await userEvent.keyboard('{ArrowRight}')
    expect(tab('Artifacts')).toHaveAttribute('aria-pressed', 'true')
    await userEvent.keyboard('{ArrowRight}')
    expect(tab('Sessions')).toHaveAttribute('aria-pressed', 'true')
  })

  it('goes back to every command from the All tab', async () => {
    render(<Palette />)
    await userEvent.click(
      await screen.findByRole('button', { name: 'Sessions' })
    )
    await userEvent.click(tab('All'))
    expect(options()).toHaveLength(4)
  })

  it('stops changing type with the arrows once the tabs are gone', async () => {
    const { rerender } = render(<Palette />)
    await screen.findAllByRole('option')
    rerender(<Palette withScopes={false} />)
    screen.getByRole('combobox').focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(options()).toHaveLength(4)
  })

  it('leaves the arrows alone while composing text or held with a modifier', async () => {
    render(<Palette />)
    const input = await screen.findByRole('combobox')
    fireEvent.keyDown(input, { key: 'ArrowRight', isComposing: true })
    fireEvent.keyDown(input, { key: 'ArrowRight', keyCode: 229 })
    fireEvent.keyDown(input, { key: 'ArrowRight', altKey: true })
    fireEvent.keyDown(input, { key: 'ArrowRight', metaKey: true })
    fireEvent.keyDown(input, { key: 'ArrowRight', ctrlKey: true })
    expect(tab('All')).toHaveAttribute('aria-pressed', 'true')
  })

  it('opens on the default type again each time', async () => {
    const { rerender } = render(<Palette open defaultScope='sessions' />)
    expect(await screen.findAllByRole('option')).toHaveLength(3)
    await userEvent.click(tab('Artifacts'))
    expect(options()).toEqual(['Release notes'])
    rerender(<Palette open={false} defaultScope='sessions' />)
    rerender(<Palette open defaultScope='sessions' />)
    expect(await screen.findAllByRole('option')).toHaveLength(3)
    expect(tab('Sessions')).toHaveAttribute('aria-pressed', 'true')
  })

  it('takes the type from the app when controlled', async () => {
    const onScopeChange = vi.fn()
    render(<Palette scope='artifacts' onScopeChange={onScopeChange} />)
    expect(await screen.findAllByRole('option')).toHaveLength(1)
    await userEvent.click(tab('Sessions'))
    expect(onScopeChange).toHaveBeenLastCalledWith('sessions')
    expect(options()).toEqual(['Release notes'])
  })

  it('draws each footer hint as keys with a label', async () => {
    render(<Palette />)
    const hint = (await screen.findByText('Change type')).closest(
      '[data-slot="command-palette-hint"]'
    )!
    expect(hint.querySelectorAll('kbd').length).toBeGreaterThan(0)
  })
})
