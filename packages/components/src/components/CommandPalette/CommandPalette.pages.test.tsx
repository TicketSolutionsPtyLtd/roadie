import { useState } from 'react'

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { CommandPalette } from '.'

type Command = {
  label: string
  page?: string
  scope?: string
  keywords?: string[]
  onSelect?: () => void
}

const STATUSES = ['Draft', 'On sale', 'Sold out']

function Palette({
  onStatus = () => {},
  defaultOpen = true
}: {
  onStatus?: (status: string) => void
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const commands: Command[] = [
    { label: 'Change status…', page: 'status' },
    { label: 'Invite teammate', onSelect: () => {} }
  ]
  const statuses: Command[] = STATUSES.map((label) => ({
    label,
    keywords: label === 'Sold out' ? ['soldout', 'full'] : undefined,
    onSelect: () => onStatus(label)
  }))
  return (
    <>
      <button type='button' onClick={() => setOpen(true)}>
        Open palette
      </button>
      <CommandPalette
        open={open}
        onOpenChange={setOpen}
        shortcut={false}
        items={commands}
      >
        <CommandPalette.Input />
        <CommandPalette.List>
          {(command: Command) => (
            <CommandPalette.Item
              key={command.label}
              value={command}
              page={command.page}
              onSelect={command.onSelect}
            >
              {command.label}
            </CommandPalette.Item>
          )}
        </CommandPalette.List>
        <CommandPalette.Empty>No actions match</CommandPalette.Empty>
        <CommandPalette.Page
          value='status'
          label='Change status'
          items={statuses}
        >
          <CommandPalette.List>
            {(status: Command) => (
              <CommandPalette.Item
                key={status.label}
                value={status}
                onSelect={status.onSelect}
              >
                {status.label}
              </CommandPalette.Item>
            )}
          </CommandPalette.List>
          <CommandPalette.Empty>No statuses match</CommandPalette.Empty>
        </CommandPalette.Page>
      </CommandPalette>
    </>
  )
}

const options = () =>
  screen.queryAllByRole('option').map((option) => option.textContent)

async function openStatusPage() {
  const input = await screen.findByRole('combobox')
  await userEvent.type(input, 'status')
  await userEvent.keyboard('{Enter}')
  await waitFor(() => expect(options()).toEqual(STATUSES))
  return input
}

const chip = () => screen.queryByRole('button', { name: /^Back to/ })

describe('CommandPalette pages', () => {
  it('opens a page from a command, clearing the search and showing its label and commands', async () => {
    render(<Palette />)
    const input = await openStatusPage()
    expect(input).toHaveValue('')
    expect(chip()).toHaveTextContent('Change status')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('goes back from a page with Backspace on an empty search', async () => {
    render(<Palette />)
    const input = await openStatusPage()
    await userEvent.type(input, 'dr')
    await userEvent.keyboard('{Backspace}')
    expect(input).toHaveValue('d')
    expect(chip()).toHaveTextContent('Change status')
    await userEvent.keyboard('{Backspace}')
    expect(input).toHaveValue('')
    expect(options()).toEqual(['Draft', 'On sale', 'Sold out'])
    await userEvent.keyboard('{Backspace}')
    expect(chip()).not.toBeInTheDocument()
    expect(options()).toEqual(['Change status…', 'Invite teammate'])
  })

  it('goes back a page from its chip, returning focus to the search', async () => {
    render(<Palette />)
    const input = await openStatusPage()
    const back = screen.getByRole('button', { name: 'Back to all commands' })
    expect(back).toHaveTextContent('Change status')
    expect(back).toHaveClass('is-interactive')
    await userEvent.click(back)
    expect(options()).toEqual(['Change status…', 'Invite teammate'])
    expect(chip()).not.toBeInTheDocument()
    expect(input).toHaveFocus()
  })

  it("names the chip's way back for the page before", async () => {
    render(
      <CommandPalette
        defaultOpen
        shortcut={false}
        items={[{ label: 'Change status…', page: 'status' }]}
      >
        <CommandPalette.Input />
        <CommandPalette.List>
          {(command: Command) => (
            <CommandPalette.Item
              key={command.label}
              value={command}
              page={command.page}
            >
              {command.label}
            </CommandPalette.Item>
          )}
        </CommandPalette.List>
        <CommandPalette.Page
          value='status'
          label='Change status'
          items={[{ label: 'Sold out', page: 'confirm' }]}
        >
          <CommandPalette.List>
            {(status: Command) => (
              <CommandPalette.Item
                key={status.label}
                value={status}
                page={status.page}
              >
                {status.label}
              </CommandPalette.Item>
            )}
          </CommandPalette.List>
        </CommandPalette.Page>
        <CommandPalette.Page value='confirm' label='Confirm' items={['Yes']}>
          <CommandPalette.List>
            {(answer: string) => (
              <CommandPalette.Item key={answer} value={answer}>
                {answer}
              </CommandPalette.Item>
            )}
          </CommandPalette.List>
        </CommandPalette.Page>
      </CommandPalette>
    )
    await userEvent.click(
      await screen.findByRole('option', { name: 'Change status…' })
    )
    await userEvent.click(
      await screen.findByRole('option', { name: 'Sold out' })
    )
    await userEvent.click(
      await screen.findByRole('button', { name: 'Back to Change status' })
    )
    expect(options()).toEqual(['Sold out'])
    expect(
      screen.getByRole('button', { name: 'Back to all commands' })
    ).toBeInTheDocument()
  })

  it('goes back from a page with Escape, and closes with Escape on the first page', async () => {
    const onOpenChange = vi.fn()
    render(
      <CommandPalette
        defaultOpen
        shortcut={false}
        onOpenChange={onOpenChange}
        items={[{ label: 'Change status…', page: 'status' }]}
      >
        <CommandPalette.Input />
        <CommandPalette.List>
          {(command: Command) => (
            <CommandPalette.Item
              key={command.label}
              value={command}
              page={command.page}
            >
              {command.label}
            </CommandPalette.Item>
          )}
        </CommandPalette.List>
        <CommandPalette.Page
          value='status'
          label='Change status'
          items={STATUSES}
        >
          <CommandPalette.List>
            {(status: string) => (
              <CommandPalette.Item key={status} value={status}>
                {status}
              </CommandPalette.Item>
            )}
          </CommandPalette.List>
        </CommandPalette.Page>
      </CommandPalette>
    )
    await userEvent.click(
      await screen.findByRole('option', { name: 'Change status…' })
    )
    await waitFor(() => expect(options()).toEqual(STATUSES))
    await userEvent.keyboard('{Escape}')
    expect(options()).toEqual(['Change status…'])
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalled()
    await userEvent.keyboard('{Escape}')
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
    expect(onOpenChange).toHaveBeenLastCalledWith(false, {
      reason: 'escape-key'
    })
  })

  it("shows only the open page's empty state", async () => {
    render(<Palette />)
    const input = await openStatusPage()
    await userEvent.type(input, 'zzz')
    expect(await screen.findByText('No statuses match')).toBeInTheDocument()
    expect(screen.queryByText('No actions match')).not.toBeInTheDocument()
  })

  it('names the list with the open page', async () => {
    render(<Palette />)
    await openStatusPage()
    expect(screen.getByRole('listbox')).toHaveAccessibleName(
      expect.stringContaining('Change status')
    )
  })

  it("ranks and matches keywords among a page's commands", async () => {
    render(<Palette />)
    const input = await openStatusPage()
    await userEvent.type(input, 'sale')
    expect(options()).toEqual(['On sale'])
    await userEvent.clear(input)
    await userEvent.type(input, 'full')
    expect(options()).toEqual(['Sold out'])
    await userEvent.clear(input)
    await userEvent.type(input, 's')
    expect(options()).toEqual(['Sold out', 'On sale'])
  })

  it('runs a command on a page and closes', async () => {
    const onStatus = vi.fn()
    render(<Palette onStatus={onStatus} />)
    await openStatusPage()
    await userEvent.keyboard('{ArrowDown}{Enter}')
    expect(onStatus).toHaveBeenCalledWith('On sale')
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
  })

  it('starts each opening on the first page', async () => {
    render(<Palette />)
    await openStatusPage()
    await userEvent.keyboard('{ArrowDown}{Enter}')
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
    await userEvent.click(screen.getByRole('button', { name: 'Open palette' }))
    expect(await screen.findByRole('combobox')).toHaveValue('')
    expect(chip()).not.toBeInTheDocument()
    expect(options()).toEqual(['Change status…', 'Invite teammate'])
  })

  it('hides the type tabs on a page, and brings the chosen type back on the first page', async () => {
    render(
      <CommandPalette
        defaultOpen
        shortcut={false}
        items={[
          { label: 'Change status…', page: 'status', scope: 'events' },
          { label: 'Kazoo Hollow Room', scope: 'venues' }
        ]}
      >
        <CommandPalette.Input />
        <CommandPalette.Scopes>
          <CommandPalette.Scope value='events'>Events</CommandPalette.Scope>
          <CommandPalette.Scope value='venues'>Venues</CommandPalette.Scope>
        </CommandPalette.Scopes>
        <CommandPalette.List>
          {(command: Command) => (
            <CommandPalette.Item
              key={command.label}
              value={command}
              page={command.page}
            >
              {command.label}
            </CommandPalette.Item>
          )}
        </CommandPalette.List>
        <CommandPalette.Page
          value='status'
          label='Change status'
          items={STATUSES}
        >
          <CommandPalette.List>
            {(status: string) => (
              <CommandPalette.Item key={status} value={status}>
                {status}
              </CommandPalette.Item>
            )}
          </CommandPalette.List>
        </CommandPalette.Page>
      </CommandPalette>
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Events' }))
    await userEvent.click(
      screen.getByRole('option', { name: 'Change status…' })
    )
    await waitFor(() => expect(options()).toEqual(STATUSES))
    expect(
      screen.queryByRole('group', { name: 'Type' })
    ).not.toBeInTheDocument()
    screen.getByRole('combobox').focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(options()).toEqual(STATUSES)
    await userEvent.keyboard('{Backspace}')
    expect(screen.getByRole('button', { name: 'Events' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(options()).toEqual(['Change status…'])
  })
})
