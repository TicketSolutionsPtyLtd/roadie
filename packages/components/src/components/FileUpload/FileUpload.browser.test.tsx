import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import { FileUpload } from '.'

afterEach(() => cleanup())

const csv = (name: string) => new File(['a,b\n1,2'], name, { type: 'text/csv' })

const postedFiles = () =>
  new FormData(screen.getByRole('form'))
    .getAll('payments')
    .map((file) => (file as File).name)

describe('FileUpload in a form', () => {
  it('posts its value under name', () => {
    render(
      <form aria-label='Import'>
        <FileUpload name='payments' defaultValue={[csv('march.csv')]}>
          <FileUpload.Trigger>Choose a CSV</FileUpload.Trigger>
        </FileUpload>
      </form>
    )
    expect(postedFiles()).toEqual(['march.csv'])
  })

  it('keeps posting the last good file after a rejected pick', async () => {
    const { container } = render(
      <form aria-label='Import'>
        <FileUpload
          name='payments'
          accept='.csv'
          defaultValue={[csv('march.csv')]}
        >
          <FileUpload.Trigger>Choose a CSV</FileUpload.Trigger>
        </FileUpload>
      </form>
    )
    const input = container.querySelector('input[type=file]')!
    await userEvent.upload(input, new File(['%PDF'], 'march.pdf'))
    await waitFor(() => expect(postedFiles()).toEqual(['march.csv']))
  })
})
