import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { FileUpload } from '.'
import { Field } from '../Field'

const csv = (name = 'payments.csv', size = 10) =>
  new File(['x'.repeat(size)], name, { type: 'text/csv' })

const fileInput = (container: HTMLElement) =>
  container.querySelector<HTMLInputElement>('input[type=file]')!

describe('FileUpload', () => {
  it('FileUpload and FileUpload.Root are the same component reference', () => {
    expect(FileUpload).toBe(FileUpload.Root)
  })

  it('sets the value from a file picked through the Trigger', async () => {
    const onValueChange = vi.fn()
    const { container } = render(
      <FileUpload name='payments' onValueChange={onValueChange}>
        <FileUpload.Trigger>Choose a CSV</FileUpload.Trigger>
      </FileUpload>
    )
    const input = fileInput(container)
    const click = vi.spyOn(input, 'click')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Choose a CSV' }))
    expect(click).toHaveBeenCalled()

    const file = csv()
    await user.upload(input, file)
    await waitFor(() => expect(onValueChange).toHaveBeenCalledWith([file]))
    expect(input).toHaveAttribute('name', 'payments')
  })

  it('replaces the first file with a second pick', async () => {
    const onValueChange = vi.fn()
    const { container } = render(
      <FileUpload onValueChange={onValueChange}>
        <FileUpload.Trigger>Choose a CSV</FileUpload.Trigger>
      </FileUpload>
    )
    const user = userEvent.setup()
    await user.upload(fileInput(container), csv('march.csv'))
    const april = csv('april.csv')
    await user.upload(fileInput(container), april)
    await waitFor(() => expect(onValueChange).toHaveBeenLastCalledWith([april]))
  })

  it.each([
    ['an extension in any case', '.csv', 'PAYMENTS.CSV', 'text/plain'],
    ['a MIME type', 'application/pdf', 'payments.pdf', 'application/pdf'],
    ['a wildcard', 'image/*', 'poster.png', 'image/png']
  ])('takes a file matching %s', async (_, accept, name, type) => {
    const onValueChange = vi.fn()
    const { container } = render(
      <FileUpload accept={`.txt, ${accept}`} onValueChange={onValueChange}>
        <FileUpload.Trigger>Choose a file</FileUpload.Trigger>
      </FileUpload>
    )
    const file = new File(['x'], name, { type })
    await userEvent
      .setup({ applyAccept: false })
      .upload(fileInput(container), file)
    await waitFor(() => expect(onValueChange).toHaveBeenCalledWith([file]))
  })

  it.each([
    {
      code: 'wrong-type',
      props: { accept: 'text/csv, image/*' },
      file: new File(['x'], 'payments.xlsx', {
        type: 'application/vnd.ms-excel'
      }),
      message: "payments.xlsx isn't a file type this field takes."
    },
    {
      code: 'too-large',
      props: { maxFileSize: 1960 },
      file: csv('payments.csv', 1970),
      message: 'payments.csv is over 1.9 kB.'
    },
    {
      code: 'too-small',
      props: { minFileSize: 1040 },
      file: csv('payments.csv', 1030),
      message: 'payments.csv is under 1.1 kB.'
    }
  ])(
    'rejects with $code and shows its message in Field.ErrorText',
    async ({ code, props, file, message }) => {
      const onReject = vi.fn()
      const onValueChange = vi.fn()
      const { container } = render(
        <Field>
          <Field.Label>Payments</Field.Label>
          <FileUpload
            {...props}
            onReject={onReject}
            onValueChange={onValueChange}
          >
            <FileUpload.Trigger>Choose a CSV</FileUpload.Trigger>
          </FileUpload>
          <Field.ErrorText />
        </Field>
      )
      await userEvent
        .setup({ applyAccept: false })
        .upload(fileInput(container), file)
      expect(await screen.findByRole('alert')).toHaveTextContent(message)
      expect(onReject).toHaveBeenCalledWith([{ file, code, message }])
      expect(onValueChange).not.toHaveBeenCalled()
      expect(screen.getByRole('button')).toHaveAttribute('aria-invalid', 'true')
      expect(screen.getByRole('button')).toHaveAccessibleDescription(message)
    }
  )

  it('clears the rejection when an accepted file is picked', async () => {
    const { container } = render(
      <Field>
        <FileUpload accept='.csv'>
          <FileUpload.Trigger>Choose a CSV</FileUpload.Trigger>
        </FileUpload>
        <Field.HelperText>A CSV up to 1 MB.</Field.HelperText>
        <Field.ErrorText />
      </Field>
    )
    const user = userEvent.setup({ applyAccept: false })
    await user.upload(fileInput(container), new File(['x'], 'payments.pdf'))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    await user.upload(fileInput(container), csv())
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(screen.getByRole('button')).toHaveAccessibleDescription(
      'A CSV up to 1 MB.'
    )
  })

  it('takes required and disabled as its own props', () => {
    const { container } = render(
      <FileUpload required disabled>
        <FileUpload.Trigger>Choose a CSV</FileUpload.Trigger>
      </FileUpload>
    )
    expect(screen.getByRole('button')).toBeDisabled()
    expect(fileInput(container)).toBeRequired()
    expect(fileInput(container)).toBeDisabled()
  })

  it('takes invalid, required and disabled from Field', () => {
    const { container } = render(
      <Field invalid required disabled>
        <Field.Label>Payments</Field.Label>
        <FileUpload accept='.csv' capture='environment'>
          <FileUpload.Trigger>Choose a CSV</FileUpload.Trigger>
        </FileUpload>
      </Field>
    )
    const trigger = screen.getByRole('button', {
      name: 'Payments Choose a CSV'
    })
    expect(trigger).toHaveAttribute('aria-invalid', 'true')
    expect(trigger).toBeDisabled()
    const input = fileInput(container)
    expect(input).toBeRequired()
    expect(input).toBeDisabled()
    expect(input).toHaveAttribute('accept', '.csv')
    expect(input).toHaveAttribute('capture', 'environment')
  })

  describe('the bar', () => {
    it('shows a placeholder and Choose file when empty', () => {
      render(<FileUpload placeholder='No guest list yet' />)
      expect(screen.getByText('No guest list yet')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /Choose file$/ })
      ).toBeInTheDocument()
    })

    it('shows the picked file and offers to replace it', async () => {
      const { container } = render(<FileUpload />)
      expect(screen.getByText('No file chosen')).toBeInTheDocument()
      await userEvent.upload(fileInput(container), csv('payments.csv', 2000))
      expect(await screen.findByText('payments.csv')).toBeInTheDocument()
      expect(screen.getByText('2 kB')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'payments.csv 2 kB Replace' })
      ).toBeInTheDocument()
    })

    it('opens the picker from a click anywhere on the bar', async () => {
      const { container } = render(<FileUpload />)
      const opened = vi.fn()
      fileInput(container).addEventListener('click', opened)
      await userEvent.click(screen.getByText('No file chosen'))
      expect(opened).toHaveBeenCalled()
    })

    it('clears the file and moves focus to the Trigger', async () => {
      const onValueChange = vi.fn()
      render(
        <FileUpload defaultValue={[csv()]} onValueChange={onValueChange} />
      )
      await userEvent.click(
        screen.getByRole('button', { name: 'Remove payments.csv' })
      )
      expect(onValueChange).toHaveBeenCalledWith([])
      expect(screen.getByText('No file chosen')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Choose file$/ })).toHaveFocus()
    })

    it('marks the bar invalid and disabled from Field', () => {
      const { container } = render(
        <Field invalid disabled>
          <FileUpload />
        </Field>
      )
      const bar = container.querySelector('[data-slot=file-upload-control]')
      expect(bar).toHaveAttribute('aria-invalid', 'true')
      expect(bar).toHaveAttribute('data-disabled')
    })
  })
})
