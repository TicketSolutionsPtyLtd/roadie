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

  it('says what was added and uploaded, with the total, but not each percent', async () => {
    const { onUpload, calls } = network()
    const files = [csv('march.csv'), csv('april.csv')]
    const { rerender } = render(<FileUpload value={[]} onUpload={onUpload} />)
    rerender(<FileUpload value={files} onUpload={onUpload} />)
    // Each message is written a frame after it's emptied.
    const status = screen.getByRole('status')
    await waitFor(() => expect(status).toHaveTextContent('2 files added.'))

    await waitFor(() => expect(calls).toHaveLength(2))
    act(() => calls[1]!.onProgress(0.5))
    await act(() => new Promise(requestAnimationFrame))
    expect(status).toHaveTextContent('2 files added.')
    await act(async () => calls[1]!.resolve(null))
    await waitFor(() =>
      expect(status).toHaveTextContent('april.csv uploaded. 1 of 2 uploaded.')
    )
    await act(async () => calls[0]!.resolve(null))
    await waitFor(() =>
      expect(status).toHaveTextContent('march.csv uploaded. 2 of 2 uploaded.')
    )
  })

  it('counts uploads that finish together', async () => {
    const { onUpload, calls } = network()
    const files = [csv('march.csv'), csv('april.csv')]
    const { rerender } = render(<FileUpload value={[]} onUpload={onUpload} />)
    rerender(<FileUpload value={files} onUpload={onUpload} />)
    await waitFor(() => expect(calls).toHaveLength(2))
    await act(async () => {
      calls[0]!.resolve(null)
      calls[1]!.resolve(null)
    })
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('2 of 2 uploaded.')
    )
  })

  it('marks a failed upload and starts the next in its place', async () => {
    const { onUpload, calls } = network()
    const files = ['a', 'b', 'c', 'd'].map((name) => csv(`${name}.csv`))
    const { rerender } = render(
      <FileUpload value={[]} onUpload={onUpload}>
        <FileUpload.List>{(item) => <li>{item.status}</li>}</FileUpload.List>
      </FileUpload>
    )
    rerender(
      <FileUpload value={files} onUpload={onUpload}>
        <FileUpload.List>{(item) => <li>{item.status}</li>}</FileUpload.List>
      </FileUpload>
    )
    await waitFor(() => expect(calls).toHaveLength(3))
    await act(async () => calls[0]!.reject(new Error('offline')))
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('error')
    expect(calls).toHaveLength(4)
  })

  it('starts the next upload when an uploading file is removed, and never announces it', async () => {
    const { onUpload, calls } = network()
    const files = ['a', 'b', 'c', 'd'].map((name) => csv(`${name}.csv`))
    const { rerender } = render(<FileUpload value={[]} onUpload={onUpload} />)
    rerender(<FileUpload value={files} onUpload={onUpload} />)
    await waitFor(() => expect(calls).toHaveLength(3))
    rerender(<FileUpload value={files.slice(1)} onUpload={onUpload} />)
    expect(calls[0]!.signal.aborted).toBe(true)
    await waitFor(() => expect(calls).toHaveLength(4))
    await act(async () => calls[0]!.resolve(null))
    await act(() => new Promise(requestAnimationFrame))
    expect(screen.getByRole('status')).not.toHaveTextContent('a.csv uploaded')
  })

  it("names a waiting file's ring for the wait", async () => {
    const { onUpload } = network()
    const files = ['a', 'b', 'c', 'd'].map((name) => csv(`${name}.csv`))
    const { rerender } = render(<FileUpload value={[]} onUpload={onUpload} />)
    rerender(<FileUpload value={files} onUpload={onUpload} />)
    expect(
      await screen.findByRole('progressbar', {
        name: 'Waiting to upload d.csv'
      })
    ).toBeInTheDocument()
  })

  it('reads Cancel while uploading, and cancelling aborts and removes the file', async () => {
    const { onUpload, calls } = network()
    const onValueChange = vi.fn()
    const { container } = render(
      <FileUpload onUpload={onUpload} onValueChange={onValueChange} />
    )
    await pick(container, csv('march.csv'))
    await waitFor(() => expect(calls).toHaveLength(1))
    await userEvent.click(
      screen.getByRole('button', { name: 'Cancel march.csv' })
    )
    expect(calls[0]!.signal.aborted).toBe(true)
    expect(onValueChange).toHaveBeenLastCalledWith([])
  })

  it('shows a failed upload with its message and Retry, and says so at once', async () => {
    const { onUpload, calls } = network()
    const { container } = render(<FileUpload onUpload={onUpload} />)
    await pick(container, csv('march.csv'))
    await waitFor(() => expect(calls).toHaveLength(1))
    await act(async () => calls[0]!.reject(new Error('503')))
    const alarm = container.querySelector('[aria-live=assertive]')
    expect(screen.getByRole('listitem')).toHaveTextContent(
      "This file couldn't upload. Try again."
    )
    expect(
      screen.getByRole('button', { name: 'Retry march.csv' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Remove march.csv' })
    ).toBeInTheDocument()
    expect(alarm).toHaveTextContent(
      "march.csv couldn't upload. Retry is available."
    )
  })

  it('runs the upload again on Retry, which can succeed', async () => {
    const { onUpload, calls } = network()
    const { container } = render(<FileUpload onUpload={onUpload} />)
    await pick(container, csv('march.csv'))
    await waitFor(() => expect(calls).toHaveLength(1))
    await act(async () => calls[0]!.reject(new Error('503')))
    await userEvent.click(
      screen.getByRole('button', { name: 'Retry march.csv' })
    )
    expect(
      screen.getByRole('button', { name: 'Cancel march.csv' })
    ).toHaveFocus()
    await waitFor(() => expect(calls).toHaveLength(2))
    expect(calls[1]!.file.name).toBe('march.csv')
    await act(async () => calls[1]!.resolve(null))
    expect(screen.getByRole('img', { name: 'Uploaded' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Retry/ })).toBeNull()
    expect(
      container.querySelector('[aria-live=assertive]')
    ).toBeEmptyDOMElement()
  })

  it('reads Cancel for a file still waiting its turn', async () => {
    const { onUpload } = network()
    const files = ['a', 'b', 'c', 'd'].map((name) => csv(`${name}.csv`))
    const { rerender } = render(<FileUpload value={[]} onUpload={onUpload} />)
    rerender(<FileUpload value={files} onUpload={onUpload} />)
    expect(
      await screen.findByRole('button', { name: 'Cancel d.csv' })
    ).toBeInTheDocument()
  })

  it('announces failures that land together, and the same file failing again', async () => {
    const { onUpload, calls } = network()
    const files = [csv('march.csv'), csv('april.csv')]
    const { container, rerender } = render(
      <FileUpload value={[]} onUpload={onUpload}>
        <FileUpload.List>
          {(item) => (
            <FileUpload.Item data-testid={item.file.name}>
              {String(item.error)}
              <FileUpload.ItemRetry />
            </FileUpload.Item>
          )}
        </FileUpload.List>
      </FileUpload>
    )
    rerender(
      <FileUpload value={files} onUpload={onUpload}>
        <FileUpload.List>
          {(item) => (
            <FileUpload.Item data-testid={item.file.name}>
              {String(item.error)}
              <FileUpload.ItemRetry />
            </FileUpload.Item>
          )}
        </FileUpload.List>
      </FileUpload>
    )
    await waitFor(() => expect(calls).toHaveLength(2))
    await act(async () => {
      calls[0]!.reject(new Error('503'))
      calls[1]!.reject(new Error('504'))
    })
    const alarm = container.querySelector('[aria-live=assertive]')
    expect(alarm).toHaveTextContent(
      "march.csv, april.csv couldn't upload. Retry is available."
    )
    expect(screen.getByTestId('march.csv')).toHaveClass('intent-danger')
    expect(screen.getByTestId('april.csv')).toHaveTextContent('Error: 504')

    await userEvent.click(
      screen.getByRole('button', { name: 'Retry march.csv' })
    )
    await waitFor(() => expect(calls).toHaveLength(3))
    expect(alarm).toBeEmptyDOMElement()
    await act(async () => calls[2]!.reject(new Error('503')))
    expect(alarm).toHaveTextContent(
      "march.csv couldn't upload. Retry is available."
    )
  })

  it('moves focus to the trigger after Retry in a row with no Remove', async () => {
    const { onUpload, calls } = network()
    const { container } = render(
      <FileUpload onUpload={onUpload}>
        <FileUpload.Trigger />
        <FileUpload.List>
          {() => (
            <FileUpload.Item>
              <FileUpload.ItemRetry />
            </FileUpload.Item>
          )}
        </FileUpload.List>
      </FileUpload>
    )
    await pick(container, csv('march.csv'))
    await waitFor(() => expect(calls).toHaveLength(1))
    await act(async () => calls[0]!.reject(new Error('503')))
    await userEvent.click(
      screen.getByRole('button', { name: 'Retry march.csv' })
    )
    expect(screen.getByRole('button', { name: /Replace/ })).toHaveFocus()
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
