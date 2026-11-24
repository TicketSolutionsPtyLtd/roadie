import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { FileUpload, type FileUploadProps } from '.'

const csv = (name: string) => new File(['x'], name, { type: 'text/csv' })

/** The network, mocked at the `onUpload` boundary: each call waits for the test. */
function network() {
  const calls: {
    file: File
    signal: AbortSignal
    onProgress: (progress: number) => void
    resolve: (result: unknown) => void
    reject: (error: unknown) => void
  }[] = []
  const onUpload = vi.fn<NonNullable<FileUploadProps['onUpload']>>(
    (file, { signal, onProgress }) =>
      new Promise((resolve, reject) =>
        calls.push({ file, signal, onProgress, resolve, reject })
      )
  )
  return { onUpload, calls }
}

const pick = async (container: HTMLElement, file: File) =>
  userEvent.upload(container.querySelector('input[type=file]')!, file)

describe('FileUpload uploads', () => {
  it('shows progress on the ring, then a check and the result', async () => {
    const { onUpload, calls } = network()
    const { container } = render(
      <FileUpload onUpload={onUpload}>
        <FileUpload.Trigger />
        <FileUpload.List>
          {(item) => (
            <FileUpload.Item>
              <FileUpload.ItemPreview>
                <FileUpload.ItemStatus />
              </FileUpload.ItemPreview>
              <span>
                {item.status} {String(item.result ?? '')}
              </span>
            </FileUpload.Item>
          )}
        </FileUpload.List>
      </FileUpload>
    )
    const march = csv('march.csv')
    await pick(container, march)
    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(1))
    expect(calls[0]!.file).toBe(march)
    const ring = screen.getByRole('progressbar', {
      name: 'Uploading march.csv'
    })
    expect(ring).toHaveAttribute('aria-valuenow', '0')
    expect(screen.getByRole('listitem')).toHaveTextContent('uploading')

    act(() => calls[0]!.onProgress(0.42))
    expect(ring).toHaveAttribute('aria-valuenow', '42')

    await act(async () => calls[0]!.resolve('https://assets.example/march'))
    expect(screen.queryByRole('progressbar')).toBeNull()
    expect(screen.getByRole('img', { name: 'Uploaded' })).toBeInTheDocument()
    expect(screen.getByRole('listitem')).toHaveTextContent(
      'done https://assets.example/march'
    )
  })

  it('runs three uploads at once and starts the next as one finishes', async () => {
    const { onUpload, calls } = network()
    const files = ['a', 'b', 'c', 'd'].map((name) => csv(`${name}.csv`))
    const { rerender } = render(
      <FileUpload value={[]} onUpload={onUpload}>
        <FileUpload.List />
      </FileUpload>
    )
    rerender(
      <FileUpload value={files} onUpload={onUpload}>
        <FileUpload.List />
      </FileUpload>
    )
    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(3))
    expect(screen.getAllByRole('progressbar')).toHaveLength(4)

    await act(async () => calls[1]!.resolve(null))
    expect(onUpload).toHaveBeenCalledTimes(4)
    expect(calls[3]!.file).toBe(files[3])
  })

  it('leaves the files it starts with alone', () => {
    const { onUpload } = network()
    render(<FileUpload defaultValue={[csv('march.csv')]} onUpload={onUpload} />)
    expect(onUpload).not.toHaveBeenCalled()
    expect(screen.queryByRole('progressbar')).toBeNull()
  })

  it('takes an editor-style upload that only reads the file', async () => {
    const onUploadImage = vi.fn(async (file: File) => file.name)
    const { container } = render(<FileUpload onUpload={onUploadImage} />)
    await pick(container, csv('march.csv'))
    await screen.findByRole('img', { name: 'Uploaded' })
  })

  it('aborts the upload of a file that leaves the value', async () => {
    const { onUpload, calls } = network()
    const { container } = render(<FileUpload onUpload={onUpload} />)
    await pick(container, csv('march.csv'))
    await waitFor(() => expect(calls).toHaveLength(1))
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove march.csv' })
    )
    expect(calls[0]!.signal.aborted).toBe(true)
  })

  it('says what was added and uploaded, with the total, but not each percent', async () => {
    const { onUpload, calls } = network()
    const files = [csv('march.csv'), csv('april.csv')]
    const { rerender } = render(<FileUpload value={[]} onUpload={onUpload} />)
    rerender(<FileUpload value={files} onUpload={onUpload} />)
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('2 files added.')

    await waitFor(() => expect(calls).toHaveLength(2))
    act(() => calls[1]!.onProgress(0.5))
    expect(status).toHaveTextContent('2 files added.')
    await act(async () => calls[1]!.resolve(null))
    expect(status).toHaveTextContent('april.csv uploaded. 1 of 2 uploaded.')
    await act(async () => calls[0]!.resolve(null))
    expect(status).toHaveTextContent('march.csv uploaded. 2 of 2 uploaded.')
  })

  it('says a single file was uploaded without a total', async () => {
    const { container } = render(<FileUpload onUpload={async () => null} />)
    await pick(container, csv('march.csv'))
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'march.csv uploaded.'
      )
    )
  })
})
