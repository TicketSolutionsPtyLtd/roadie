import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import { FileUpload } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
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

describe('FileUpload bar', () => {
  it('truncates a long file name and keeps its buttons inside', () => {
    const name = `${'Lampshade Disco final guest list '.repeat(4)}.csv`
    render(
      <div style={{ width: 300 }}>
        <FileUpload defaultValue={[csv(name)]} />
      </div>
    )
    const fileName = screen.getByText(name)
    const bar = fileName.closest('[data-slot=file-upload-control]')!
    expect(bar.getBoundingClientRect().width).toBeLessThanOrEqual(300)
    expect(fileName.getBoundingClientRect().height).toBeLessThanOrEqual(
      bar.clientHeight
    )
    const replace = screen.getByRole('button', { name: /Replace$/ })
    expect(replace.getBoundingClientRect().right).toBeLessThanOrEqual(300)
    const remove = screen.getByRole('button', { name: /^Remove/ })
    expect(
      screen.getByText('7 bytes').getBoundingClientRect().right
    ).toBeLessThanOrEqual(remove.getBoundingClientRect().left)
  })

  it('joins the Trigger to the end of the bar, full height', () => {
    render(<FileUpload />)
    const trigger = screen.getByRole('button', { name: /Choose file$/ })
    const bar = trigger.closest<HTMLElement>('[data-slot=file-upload-control]')!
    const barBox = bar.getBoundingClientRect()
    const box = trigger.getBoundingClientRect()
    expect(box.top).toBeCloseTo(barBox.top + bar.clientTop, 0)
    expect(box.height).toBeCloseTo(bar.clientHeight, 0)
    expect(box.right).toBeCloseTo(
      barBox.left + bar.clientLeft + bar.clientWidth,
      0
    )
  })
})
