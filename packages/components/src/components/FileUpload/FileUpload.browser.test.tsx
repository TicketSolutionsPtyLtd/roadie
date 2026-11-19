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

  it.each([
    {
      pick: 'a rejected pick',
      props: { accept: '.csv', defaultValue: [csv('march.csv')] },
      file: new File(['%PDF'], 'march.pdf')
    },
    {
      pick: 'a pick its controlling parent ignored',
      props: { value: [csv('march.csv')] },
      file: csv('april.csv')
    }
  ])(
    'keeps posting the last good file after $pick',
    async ({ props, file }) => {
      const { container } = render(
        <form aria-label='Import'>
          <FileUpload name='payments' {...props}>
            <FileUpload.Trigger>Choose a CSV</FileUpload.Trigger>
          </FileUpload>
        </form>
      )
      const input = container.querySelector('input[type=file]')!
      await userEvent.upload(input, file)
      await waitFor(() => expect(postedFiles()).toEqual(['march.csv']))
    }
  )

  it('moves focus to the Trigger when a required field stops a submit', async () => {
    render(
      <form aria-label='Import' onSubmit={(event) => event.preventDefault()}>
        <FileUpload name='payments' required>
          <FileUpload.Trigger>Choose a CSV</FileUpload.Trigger>
        </FileUpload>
      </form>
    )
    screen.getByRole<HTMLFormElement>('form').requestSubmit()
    await waitFor(() => expect(screen.getByRole('button')).toHaveFocus())
  })
})
