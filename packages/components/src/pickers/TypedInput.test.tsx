import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { flushSync } from 'react-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TypedInput } from './TypedInput'
import { formatDate, readDate } from './readDate'
import { useTypedValue } from './useTypedValue'

vi.mock('react-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-dom')>()
  return { ...actual, flushSync: vi.fn(actual.flushSync) }
})

function Typed({
  onValueChange
}: {
  onValueChange?: (v: string | null) => void
}) {
  const typed = useTypedValue({
    value: undefined,
    defaultValue: '2026-11-27',
    onValueChange,
    format: (date) => formatDate(date, {}),
    read: (text) => readDate(text, { today: '2026-10-03' })
  })
  return <TypedInput aria-label='Date' typed={typed} />
}

describe('TypedInput', () => {
  afterEach(() => vi.mocked(flushSync).mockClear())

  it('leaves blur alone when nothing was typed', async () => {
    render(<Typed />)
    await userEvent.click(screen.getByRole('textbox', { name: 'Date' }))
    await userEvent.tab()
    expect(flushSync).not.toHaveBeenCalled()
  })

  it('commits typed text on blur, flushed', async () => {
    const onValueChange = vi.fn()
    render(<Typed onValueChange={onValueChange} />)
    const input = screen.getByRole('textbox', { name: 'Date' })
    await userEvent.clear(input)
    await userEvent.type(input, '14 mar 2027')
    await userEvent.tab()
    expect(flushSync).toHaveBeenCalledTimes(1)
    expect(onValueChange).toHaveBeenCalledWith('2027-03-14')
  })
})
