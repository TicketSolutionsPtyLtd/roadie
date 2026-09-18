import { StrictMode } from 'react'

import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useDevWarning } from './useDevWarning'

function Warns({ message }: { message: string | false }) {
  useDevWarning(message)
  return null
}

describe('useDevWarning', () => {
  let warn: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    warn.mockRestore()
  })

  it('warns once when StrictMode replays the effect', () => {
    render(
      <StrictMode>
        <Warns message='[Roadie] once' />
      </StrictMode>
    )
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith('[Roadie] once')
  })

  it('warns again only when the message changes', () => {
    const { rerender } = render(<Warns message='[Roadie] a' />)
    rerender(<Warns message='[Roadie] a' />)
    rerender(<Warns message='[Roadie] b' />)
    expect(warn.mock.calls).toEqual([['[Roadie] a'], ['[Roadie] b']])
  })

  it('warns nothing for false', () => {
    render(<Warns message={false} />)
    expect(warn).not.toHaveBeenCalled()
  })
})
