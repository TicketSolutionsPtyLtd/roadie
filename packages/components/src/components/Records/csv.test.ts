import { afterEach, describe, expect, it, vi } from 'vitest'

import { downloadCsv } from './csv'

describe('downloadCsv', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('downloads the text as a file and revokes its URL after the click', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] })
    const create = vi.fn((_: Blob) => 'blob:csv')
    const revoke = vi.fn()
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke })
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.download).toBe('attendees.csv')
        expect(this.href).toBe('blob:csv')
        expect(this.isConnected).toBe(true)
      })
    downloadCsv('Name\r\nMia', 'attendees.csv')
    expect(click).toHaveBeenCalledOnce()
    expect(revoke).not.toHaveBeenCalled()
    vi.runAllTimers()
    const blob = create.mock.calls[0]![0]
    expect(blob.type).toBe('text/csv;charset=utf-8')
    // A byte order mark, so Excel reads the file as UTF-8.
    expect([...new Uint8Array(await blob.arrayBuffer())]).toEqual([
      0xef,
      0xbb,
      0xbf,
      ...new TextEncoder().encode('Name\r\nMia')
    ])
    expect(revoke).toHaveBeenCalledWith('blob:csv')
    expect(document.querySelector('a[download]')).toBeNull()
  })
})
