// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useCopy } from './useCopy'

// jsdom has neither the Clipboard API nor execCommand, like an insecure page.
function setClipboard(clipboard: Partial<Clipboard> | undefined) {
  Object.defineProperty(navigator, 'clipboard', {
    value: clipboard,
    configurable: true
  })
}

function setExecCommand(result: boolean | Error) {
  const execCommand = vi.fn(() => {
    if (result instanceof Error) throw result
    return result
  })
  Object.defineProperty(document, 'execCommand', {
    value: execCommand,
    configurable: true
  })
  return execCommand
}

afterEach(() => {
  cleanup()
  setClipboard(undefined)
})

async function copyWith(text: string | Promise<string>) {
  const { result } = renderHook(() => useCopy())
  await act(() => result.current.copy(text))
  return result.current
}

describe('useCopy', () => {
  it('writes through the Clipboard API when it exists', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    setClipboard({ writeText })
    const execCommand = setExecCommand(true)

    expect(await copyWith('--color-brand-5')).toMatchObject({
      copied: true,
      failed: false
    })
    expect(writeText).toHaveBeenCalledWith('--color-brand-5')
    expect(execCommand).not.toHaveBeenCalled()
  })

  it.each([
    ['no Clipboard API, as on plain HTTP', undefined],
    [
      'a refused clipboard write',
      { writeText: vi.fn().mockRejectedValue(new Error('NotAllowedError')) }
    ]
  ])('falls back to a selection copy with %s', async (_, clipboard) => {
    setClipboard(clipboard)
    const execCommand = setExecCommand(true)

    expect(await copyWith('#c2dffb')).toMatchObject({
      copied: true,
      failed: false
    })
    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(document.querySelector('textarea')).toBeNull()
  })

  it('copies text that is still loading with no Clipboard API', async () => {
    setClipboard(undefined)
    const execCommand = setExecCommand(true)

    expect(await copyWith(Promise.resolve('<svg />'))).toMatchObject({
      copied: true
    })
    expect(execCommand).toHaveBeenCalledWith('copy')
  })

  it.each([
    ['returns false', false],
    ['throws', new Error('Not supported')]
  ] as const)('fails when the selection copy %s too', async (_, result) => {
    setClipboard(undefined)
    setExecCommand(result)

    expect(await copyWith('21, 5, 0, 0')).toMatchObject({
      copied: false,
      failed: true
    })
  })

  it.each([
    ['worked', true],
    ['was refused', false]
  ] as const)('resolves to whether the copy %s', async (_, works) => {
    setClipboard(undefined)
    setExecCommand(works)
    const { result } = renderHook(() => useCopy())

    let resolved: boolean | undefined
    await act(async () => {
      resolved = await result.current.copy('#c2dffb')
    })
    expect(resolved).toBe(works)
  })
})
