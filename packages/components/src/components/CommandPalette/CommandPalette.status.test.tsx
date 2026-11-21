import { useState } from 'react'

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { CommandPalette } from '.'

type Status = 'idle' | 'loading' | 'error'
type Command = { label: string; page?: string }

const options = () =>
  screen.queryAllByRole('option').map((option) => option.textContent)

function ServerPalette({
  items,
  status,
  onRetry = () => {},
  onQueryChange
}: {
  items: Command[]
  status?: Status
  onRetry?: () => void
  onQueryChange?: (query: string) => void
}) {
  return (
    <CommandPalette
      defaultOpen
      shortcut={false}
      items={items}
      filter={null}
      status={status}
      onQueryChange={onQueryChange}
    >
      <CommandPalette.Input />
      <CommandPalette.Status>Searching…</CommandPalette.Status>
      <CommandPalette.List>
        {(command: Command) => (
          <CommandPalette.Item key={command.label} value={command}>
            {command.label}
          </CommandPalette.Item>
        )}
      </CommandPalette.List>
      <CommandPalette.Empty>No matches</CommandPalette.Empty>
      <CommandPalette.Error
        action={
          <button type='button' onClick={onRetry}>
            Try again
          </button>
        }
      >
        We couldn't search
      </CommandPalette.Error>
    </CommandPalette>
  )
}

describe('CommandPalette server results', () => {
  it('shows every result in the order given with filter={null}, whatever is typed', async () => {
    render(
      <ServerPalette
        items={[{ label: 'Reorder seats' }, { label: 'Orders' }]}
      />
    )
    const input = await screen.findByRole('combobox')
    await userEvent.type(input, 'order')
    expect(options()).toEqual(['Reorder seats', 'Orders'])
    await userEvent.type(input, 'zzz')
    expect(options()).toEqual(['Reorder seats', 'Orders'])
  })

  it('tells onQueryChange the search as it is typed, and its reset on each opening', async () => {
    const onQueryChange = vi.fn()
    function Reopenable() {
      const [open, setOpen] = useState(true)
      return (
        <>
          <button type='button' onClick={() => setOpen(true)}>
            Open palette
          </button>
          <CommandPalette
            open={open}
            onOpenChange={setOpen}
            shortcut={false}
            items={[]}
            filter={null}
            onQueryChange={onQueryChange}
          >
            <CommandPalette.Input />
          </CommandPalette>
        </>
      )
    }
    render(<Reopenable />)
    await userEvent.type(await screen.findByRole('combobox'), 've')
    expect(onQueryChange.mock.calls).toEqual([['v'], ['ve']])
    await userEvent.keyboard('{Escape}')
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
    await userEvent.click(screen.getByRole('button', { name: 'Open palette' }))
    await screen.findByRole('combobox')
    expect(onQueryChange).toHaveBeenLastCalledWith('')
  })

  it('announces its status text in a polite live region while loading, and no empty state', async () => {
    render(<ServerPalette items={[]} status='loading' />)
    const status = (await screen.findByText('Searching…')).closest(
      '[role="status"]'
    )
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(screen.queryByText('No matches')).not.toBeInTheDocument()
    expect(screen.queryByText("We couldn't search")).not.toBeInTheDocument()
  })

  it('shows a danger empty state with a retry someone can press when the search fails', async () => {
    const onRetry = vi.fn()
    render(<ServerPalette items={[]} status='error' onRetry={onRetry} />)
    const title = await screen.findByRole('heading', {
      name: "We couldn't search"
    })
    expect(title.closest('[data-slot="empty-state"]')).toHaveClass(
      'intent-danger'
    )
    expect(screen.queryByText('No matches')).not.toBeInTheDocument()
    expect(screen.queryByText('Searching…')).not.toBeInTheDocument()
    await userEvent.click(
      await screen.findByRole('button', { name: 'Try again' })
    )
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('puts focus back in the search when a retry clears the error', async () => {
    function Retrying() {
      const [status, setStatus] = useState<Status>('error')
      return (
        <ServerPalette
          items={[]}
          status={status}
          onRetry={() => setStatus('loading')}
        />
      )
    }
    render(<Retrying />)
    await userEvent.click(
      await screen.findByRole('button', { name: 'Try again' })
    )
    await screen.findByText('Searching…')
    expect(screen.getByRole('combobox')).toHaveFocus()
    await userEvent.keyboard('v')
    expect(screen.getByRole('combobox')).toHaveValue('v')
  })

  it('gives focus back to the opener when the palette closes from the retry', async () => {
    function Closable() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type='button' onClick={() => setOpen(true)}>
            Open palette
          </button>
          <CommandPalette
            open={open}
            onOpenChange={setOpen}
            shortcut={false}
            items={[]}
            status='error'
          >
            <CommandPalette.Input />
            <CommandPalette.Error
              action={<button type='button'>Try again</button>}
            >
              We couldn't search
            </CommandPalette.Error>
          </CommandPalette>
        </>
      )
    }
    render(<Closable />)
    const opener = screen.getByRole('button', { name: 'Open palette' })
    await userEvent.click(opener)
    await userEvent.click(
      await screen.findByRole('button', { name: 'Try again' })
    )
    await userEvent.keyboard('{Escape}')
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
    expect(opener).toHaveFocus()
  })

  it('shows the results once loading ends', async () => {
    const { rerender } = render(<ServerPalette items={[]} status='loading' />)
    await screen.findByText('Searching…')
    rerender(
      <ServerPalette
        items={[{ label: 'Velvet Dingo Fest' }, { label: 'Lampshade Disco' }]}
        status='idle'
      />
    )
    expect(options()).toEqual(['Velvet Dingo Fest', 'Lampshade Disco'])
    expect(screen.queryByText('Searching…')).not.toBeInTheDocument()
    expect(screen.queryByText('No matches')).not.toBeInTheDocument()
  })

  it('shows "No matches" again once a search comes back empty', async () => {
    const { rerender } = render(<ServerPalette items={[]} status='loading' />)
    await screen.findByText('Searching…')
    rerender(<ServerPalette items={[]} status='idle' />)
    expect(screen.getByText('No matches')).toBeInTheDocument()
  })
})

describe('CommandPalette status on a page', () => {
  function PagedPalette({
    status,
    people
  }: {
    status: Status
    people: string[]
  }) {
    return (
      <CommandPalette
        defaultOpen
        shortcut={false}
        status={status}
        items={[{ label: 'Assign to…', page: 'assign' }]}
      >
        <CommandPalette.Input />
        <CommandPalette.Status>Searching commands…</CommandPalette.Status>
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
        <CommandPalette.Error>Commands didn't load</CommandPalette.Error>
        <CommandPalette.Page
          value='assign'
          label='Assign to'
          items={people}
          filter={null}
        >
          <CommandPalette.Status>Searching people…</CommandPalette.Status>
          <CommandPalette.List>
            {(person: string) => (
              <CommandPalette.Item key={person} value={person}>
                {person}
              </CommandPalette.Item>
            )}
          </CommandPalette.List>
          <CommandPalette.Empty>No people match</CommandPalette.Empty>
          <CommandPalette.Error
            action={<button type='button'>Try again</button>}
          >
            People didn't load
          </CommandPalette.Error>
        </CommandPalette.Page>
      </CommandPalette>
    )
  }

  async function openAssign(
    rerender: (ui: React.ReactElement) => void,
    status: Status,
    people: string[] = []
  ) {
    await userEvent.click(
      await screen.findByRole('option', { name: 'Assign to…' })
    )
    await screen.findByRole('listbox', { name: 'Assign to' })
    rerender(<PagedPalette status={status} people={people} />)
  }

  it("shows the open page's own loading text, not the first page's", async () => {
    const { rerender } = render(<PagedPalette status='idle' people={[]} />)
    expect(screen.queryByText('Searching commands…')).not.toBeInTheDocument()
    await openAssign(rerender, 'loading')
    expect(screen.getByText('Searching people…')).toBeInTheDocument()
    expect(screen.queryByText('Searching commands…')).not.toBeInTheDocument()
    expect(screen.queryByText('No people match')).not.toBeInTheDocument()
  })

  it("shows the open page's own error, with its retry, not the first page's", async () => {
    const { rerender } = render(<PagedPalette status='idle' people={[]} />)
    await openAssign(rerender, 'error')
    expect(
      screen.getByRole('heading', { name: "People didn't load" })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled()
    expect(screen.queryByText("Commands didn't load")).not.toBeInTheDocument()
    expect(screen.queryByText('No people match')).not.toBeInTheDocument()
  })

  it("keeps a page's server results in order with the page's filter={null}", async () => {
    const { rerender } = render(<PagedPalette status='idle' people={[]} />)
    await openAssign(rerender, 'idle', ['Zed Okafor', 'Ana Silva'])
    await userEvent.type(screen.getByRole('combobox'), 'ana')
    expect(options()).toEqual(['Zed Okafor', 'Ana Silva'])
  })
})
