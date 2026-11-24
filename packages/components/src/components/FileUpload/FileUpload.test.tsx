import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, onTestFinished, vi } from 'vitest'

import { FileUpload } from '.'
import { Field } from '../Field'
import { Sortable } from '../Sortable'

const csv = (name = 'payments.csv', size = 10) =>
  new File(['x'.repeat(size)], name, { type: 'text/csv' })

const bar = (placeholder?: string) => (
  <FileUpload.Control>
    <FileUpload.Value placeholder={placeholder} />
    <FileUpload.Clear />
    <FileUpload.Trigger />
  </FileUpload.Control>
)

const paste = (target: Element, file: File) => {
  const event = new Event('paste', { bubbles: true, cancelable: true })
  Object.assign(event, { clipboardData: { files: [file] } })
  target.dispatchEvent(event)
}

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

  it('takes a file that validate passes', async () => {
    const onValueChange = vi.fn()
    const validate = vi.fn(async () => null)
    const { container } = render(
      <FileUpload validate={validate} onValueChange={onValueChange}>
        <FileUpload.Trigger>Choose a CSV</FileUpload.Trigger>
      </FileUpload>
    )
    const file = csv()
    await userEvent.upload(fileInput(container), file)
    expect(validate).toHaveBeenCalledWith(file)
    await waitFor(() => expect(onValueChange).toHaveBeenCalledWith([file]))
  })

  it('checks each of several files and takes the ones that pass', async () => {
    const onValueChange = vi.fn()
    const onReject = vi.fn()
    const march = csv('march.csv')
    const april = csv('april.csv')
    const { container } = render(
      <FileUpload
        maxFiles={3}
        validate={async (file) =>
          file === april ? 'april.csv has no Email column.' : null
        }
        onValueChange={onValueChange}
        onReject={onReject}
      >
        <FileUpload.Trigger>Choose CSVs</FileUpload.Trigger>
      </FileUpload>
    )
    await userEvent.upload(fileInput(container), [march, april])
    await waitFor(() => expect(onValueChange).toHaveBeenCalledWith([march]))
    expect(onReject).toHaveBeenCalledWith([
      {
        file: april,
        code: 'invalid',
        message: 'april.csv has no Email column.'
      }
    ])
  })

  it('adds both of two quick picks once their checks land', async () => {
    const onValueChange = vi.fn()
    const passes: ((message: null) => void)[] = []
    const march = csv('march.csv')
    const april = csv('april.csv')
    const { container } = render(
      <FileUpload
        maxFiles={3}
        validate={() => new Promise<null>((resolve) => passes.push(resolve))}
        onValueChange={onValueChange}
      >
        <FileUpload.Trigger>Choose CSVs</FileUpload.Trigger>
      </FileUpload>
    )
    await userEvent.upload(fileInput(container), march)
    await userEvent.upload(fileInput(container), april)
    await act(async () => passes[1]!(null))
    await act(async () => passes[0]!(null))
    expect(onValueChange).toHaveBeenLastCalledWith([april, march])
  })

  it('shows the files validate is still checking', async () => {
    const passes: ((message: null) => void)[] = []
    const { container } = render(
      <FileUpload
        maxFiles={3}
        validate={() => new Promise<null>((resolve) => passes.push(resolve))}
      >
        <FileUpload.Dropzone />
        <FileUpload.Trigger />
      </FileUpload>
    )
    const zone = screen.getByRole('button', { name: /^Drop files/ })
    const trigger = screen.getByRole('button', { name: 'Choose files' })
    await userEvent.upload(fileInput(container), csv('march.csv'))
    expect(zone).toHaveAttribute('aria-busy', 'true')
    expect(trigger).toHaveAttribute('aria-busy', 'true')
    expect(zone).toHaveTextContent('Checking march.csv…')
    expect(screen.getByRole('status')).toHaveTextContent('Checking march.csv.')
    expect(container.firstElementChild).toHaveAttribute('data-checking')

    await userEvent.upload(fileInput(container), [
      csv('april.csv'),
      csv('may.csv')
    ])
    expect(zone).toHaveTextContent('Checking 3 files…')
    await act(async () => passes.forEach((pass) => pass(null)))
    expect(zone).not.toHaveAttribute('aria-busy')
    expect(trigger).not.toHaveAttribute('aria-busy')
    expect(zone).not.toHaveTextContent('Checking')
    expect(container.firstElementChild).not.toHaveAttribute('data-checking')
  })

  it('stops showing a check that a Clear made stale', async () => {
    const { container } = render(
      <FileUpload
        defaultValue={[csv('march.csv')]}
        validate={() => new Promise<null>(() => {})}
      >
        {bar()}
      </FileUpload>
    )
    await userEvent.upload(fileInput(container), csv('april.csv'))
    expect(container.firstElementChild).toHaveAttribute('data-checking')
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove march.csv' })
    )
    expect(container.firstElementChild).not.toHaveAttribute('data-checking')
  })

  it('shows only the newer pick as checking when it replaces one', async () => {
    const passes = new Map<string, (message: null) => void>()
    const { container } = render(
      <FileUpload
        validate={(file) =>
          new Promise<null>((resolve) => passes.set(file.name, resolve))
        }
      />
    )
    const zone = screen.getByRole('button', { name: /^Drop a file/ })
    await userEvent.upload(fileInput(container), csv('march.csv'))
    await userEvent.upload(fileInput(container), csv('april.csv'))
    expect(zone).toHaveTextContent('Checking april.csv…')
    await act(async () => passes.get('april.csv')!(null))
    expect(container.firstElementChild).not.toHaveAttribute('data-checking')
  })

  it("doesn't count a file validate turns away against maxFiles", async () => {
    const onValueChange = vi.fn()
    const bad = csv('bad.csv')
    const good = csv('good.csv')
    const { container } = render(
      <FileUpload
        maxFiles={2}
        defaultValue={[csv('march.csv')]}
        validate={async (file) => (file === bad ? 'bad.csv is empty.' : null)}
        onValueChange={onValueChange}
      >
        <FileUpload.Trigger>Choose CSVs</FileUpload.Trigger>
      </FileUpload>
    )
    await userEvent.upload(fileInput(container), [bad, good])
    await waitFor(() =>
      expect(onValueChange).toHaveBeenCalledWith([expect.anything(), good])
    )
  })

  it('shows a rule rejection at once, and keeps it when the rest land', async () => {
    let pass: (message: null) => void = () => {}
    const { container } = render(
      <Field>
        <Field.Label>Payments</Field.Label>
        <FileUpload
          maxFiles={3}
          maxFileSize={5}
          validate={() => new Promise<null>((resolve) => (pass = resolve))}
        >
          <FileUpload.Trigger>Choose CSVs</FileUpload.Trigger>
        </FileUpload>
        <Field.ErrorText />
      </Field>
    )
    await userEvent.upload(fileInput(container), [
      csv('big.csv', 10),
      csv('small.csv', 1)
    ])
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'big.csv is over'
    )
    await act(async () => pass(null))
    expect(screen.getByRole('alert')).toHaveTextContent('big.csv is over')
  })

  it("keeps the rules' messages beside the ones validate adds", async () => {
    const onReject = vi.fn()
    const { container } = render(
      <Field>
        <Field.Label>Payments</Field.Label>
        <FileUpload
          maxFiles={3}
          maxFileSize={5}
          validate={async (file) => `${file.name} is empty.`}
          onReject={onReject}
        >
          <FileUpload.Trigger>Choose CSVs</FileUpload.Trigger>
        </FileUpload>
        <Field.ErrorText />
      </Field>
    )
    await userEvent.upload(fileInput(container), [
      csv('big.csv', 10),
      csv('small.csv', 1)
    ])
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('small.csv is empty.')
    )
    expect(screen.getByRole('alert')).toHaveTextContent('big.csv is over')
    expect(onReject).toHaveBeenCalledTimes(2)
  })

  it("doesn't run validate on a file another rule turns away", async () => {
    const validate = vi.fn(() => null)
    const { container } = render(
      <FileUpload accept='image/*' validate={validate}>
        <FileUpload.Trigger>Choose an image</FileUpload.Trigger>
      </FileUpload>
    )
    await userEvent
      .setup({ applyAccept: false })
      .upload(fileInput(container), csv())
    expect(validate).not.toHaveBeenCalled()
  })

  it("doesn't bring a file back when the field is cleared during its check", async () => {
    const onValueChange = vi.fn()
    let pass: (message: null) => void = () => {}
    const { container } = render(
      <FileUpload
        defaultValue={[csv('march.csv')]}
        validate={() => new Promise<null>((resolve) => (pass = resolve))}
        onValueChange={onValueChange}
      >
        <FileUpload.Trigger>Choose a CSV</FileUpload.Trigger>
        <FileUpload.Clear />
      </FileUpload>
    )
    await userEvent.upload(fileInput(container), csv('april.csv'))
    await userEvent.click(screen.getByRole('button', { name: /^Remove/ }))
    expect(onValueChange).toHaveBeenLastCalledWith([])
    await act(async () => pass(null))
    expect(onValueChange).toHaveBeenCalledTimes(1)
  })

  it('keeps the latest pick when an earlier check finishes after it', async () => {
    const onValueChange = vi.fn()
    let passSlow: (message: null) => void = () => {}
    const validate = vi.fn((file: File) =>
      file.name === 'slow.csv'
        ? new Promise<null>((resolve) => (passSlow = resolve))
        : Promise.resolve(null)
    )
    const { container } = render(
      <FileUpload validate={validate} onValueChange={onValueChange}>
        <FileUpload.Trigger>Choose a CSV</FileUpload.Trigger>
      </FileUpload>
    )
    const fast = csv('fast.csv')
    await userEvent.upload(fileInput(container), csv('slow.csv'))
    await userEvent.upload(fileInput(container), fast)
    await waitFor(() => expect(onValueChange).toHaveBeenCalledWith([fast]))
    await act(async () => passSlow(null))
    expect(onValueChange).toHaveBeenCalledTimes(1)
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
    },
    {
      code: 'invalid',
      props: {
        validate: async (file: File) =>
          `${file.name} has no Email column.` as string | null
      },
      file: csv('payments.csv'),
      message: 'payments.csv has no Email column.'
    },
    {
      code: 'invalid',
      props: {
        validate: async (): Promise<string | null> => {
          throw new Error('decode failed')
        }
      },
      file: csv('payments.csv'),
      message: "payments.csv couldn't be checked. Try another file."
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

  describe('the dropzone', () => {
    it('is what FileUpload renders with no children', () => {
      render(
        <Field>
          <Field.Label>Event image</Field.Label>
          <FileUpload />
        </Field>
      )
      expect(
        screen.getByRole('button', {
          name: 'Event image Drop a file, or choose one'
        })
      ).toHaveAttribute('data-slot', 'file-upload-dropzone')
    })

    it.each(['{Enter}', ' '])('opens the picker on %s', async (key) => {
      const { container } = render(<FileUpload />)
      const click = vi.spyOn(fileInput(container), 'click')
      const user = userEvent.setup()
      await user.tab()
      expect(screen.getByRole('button')).toHaveFocus()
      await user.keyboard(key)
      expect(click).toHaveBeenCalledTimes(1)
    })

    it('lists the chosen file under it, with a way to remove it', () => {
      render(<FileUpload defaultValue={[csv('payments.csv', 1960)]} />)
      expect(screen.getByRole('listitem')).toHaveTextContent('payments.csv2 kB')
      expect(
        screen.getByRole('button', { name: 'Remove payments.csv' })
      ).toBeInTheDocument()
    })

    it('leaves the tab order and keeps the picker shut when disabled', async () => {
      const { container } = render(<FileUpload disabled />)
      const click = vi.spyOn(fileInput(container), 'click')
      const zone = screen.getByRole('button')
      expect(zone).toHaveAttribute('aria-disabled', 'true')
      expect(zone).not.toHaveAttribute('tabindex')
      await userEvent.click(zone)
      expect(click).not.toHaveBeenCalled()
    })
  })

  describe('paste', () => {
    it.each([
      ['the dropzone', undefined],
      ['the bar', bar()]
    ])('adds a pasted file in %s', async (_, children) => {
      const onValueChange = vi.fn()
      render(<FileUpload onValueChange={onValueChange}>{children}</FileUpload>)
      const file = csv()
      paste(screen.getAllByRole('button')[0]!, file)
      await waitFor(() => expect(onValueChange).toHaveBeenCalledWith([file]))
    })

    it('leaves a paste in a text field inside to the field', () => {
      const onValueChange = vi.fn()
      render(
        <FileUpload onValueChange={onValueChange}>
          <input aria-label='Note' />
        </FileUpload>
      )
      paste(screen.getByRole('textbox'), csv())
      expect(onValueChange).not.toHaveBeenCalled()
    })

    it('ignores a paste while disabled', () => {
      const onValueChange = vi.fn()
      render(<FileUpload disabled onValueChange={onValueChange} />)
      paste(screen.getByRole('button'), csv())
      expect(onValueChange).not.toHaveBeenCalled()
    })
  })

  describe('the bar', () => {
    it('shows a placeholder and Choose file when empty', () => {
      render(<FileUpload>{bar('No guest list yet')}</FileUpload>)
      expect(screen.getByText('No guest list yet')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /Choose file$/ })
      ).toBeInTheDocument()
    })

    it('shows the picked file and offers to replace it', async () => {
      const { container } = render(<FileUpload>{bar()}</FileUpload>)
      expect(screen.getByText('No file chosen')).toBeInTheDocument()
      await userEvent.upload(fileInput(container), csv('payments.csv', 1960))
      expect(await screen.findByText('payments.csv')).toBeInTheDocument()
      expect(screen.getByText('2 kB')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'payments.csv 2 kB Replace' })
      ).toBeInTheDocument()
    })

    it("keeps the file in the Trigger's name when Value takes its own id", () => {
      render(
        <FileUpload defaultValue={[csv()]}>
          <FileUpload.Control>
            {/* @ts-expect-error: id isn't a prop, but an untyped caller's mustn't break the Trigger's name. */}
            <FileUpload.Value id='guest-list-value' />
            <FileUpload.Trigger />
          </FileUpload.Control>
        </FileUpload>
      )
      expect(
        screen.getByRole('button', { name: /^payments\.csv .* Replace$/ })
      ).toBeInTheDocument()
    })

    it('opens the picker from a click anywhere on the bar', async () => {
      const { container } = render(<FileUpload>{bar()}</FileUpload>)
      const opened = vi.fn()
      fileInput(container).addEventListener('click', opened)
      await userEvent.click(screen.getByText('No file chosen'))
      expect(opened).toHaveBeenCalled()
    })

    it('clears the file and moves focus to the Trigger', async () => {
      const onValueChange = vi.fn()
      render(
        <FileUpload defaultValue={[csv()]} onValueChange={onValueChange}>
          {bar()}
        </FileUpload>
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
          <FileUpload>{bar()}</FileUpload>
        </Field>
      )
      const control = container.querySelector('[data-slot=file-upload-control]')
      expect(control).toHaveAttribute('aria-invalid', 'true')
      expect(control).toHaveAttribute('data-disabled')
    })

    it("keeps a disabled field's file from being removed", () => {
      render(
        <Field disabled>
          <FileUpload defaultValue={[csv()]}>{bar()}</FileUpload>
        </Field>
      )
      expect(
        screen.getByRole('button', { name: 'Remove payments.csv' })
      ).toBeDisabled()
    })
  })

  describe('the list', () => {
    const pdf = new File(['x'.repeat(2048)], 'rider.pdf', {
      type: 'application/pdf'
    })
    const poster = new File(['x'], 'poster.png', { type: 'image/png' })

    it('previews an image and gives a PDF an icon, each with its name and size', async () => {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:poster')
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
      HTMLImageElement.prototype.decode = vi.fn(async () => {})
      const { container } = render(
        <FileUpload value={[poster, pdf]}>
          <FileUpload.List />
        </FileUpload>
      )
      const [image, document] = screen.getAllByRole('listitem') as [
        HTMLElement,
        HTMLElement
      ]
      expect(image).toHaveTextContent('poster.png1 byte')
      expect(document).toHaveTextContent('rider.pdf2 kB')
      await waitFor(() =>
        expect(image.querySelector('img')).toHaveAttribute('src', 'blob:poster')
      )
      expect(document.querySelector('img')).toBeNull()
      expect(document.querySelector('svg')).toBeInTheDocument()
      expect(container.querySelectorAll('img')).toHaveLength(1)
      vi.restoreAllMocks()
    })

    it('renders each file through a child function', () => {
      render(
        <FileUpload defaultValue={[pdf]}>
          <FileUpload.List>
            {({ file, id }) => (
              <FileUpload.Item data-testid={id}>
                <FileUpload.ItemName />
                {file.type}
              </FileUpload.Item>
            )}
          </FileUpload.List>
        </FileUpload>
      )
      expect(screen.getByRole('listitem')).toHaveTextContent(
        'rider.pdfapplication/pdf'
      )
      expect(screen.getByTestId(/^file-/)).toBeInTheDocument()
    })

    it('removes a file and moves focus to the next row, then the previous', async () => {
      const onValueChange = vi.fn()
      const march = csv('march.csv')
      const april = csv('april.csv')
      const may = csv('may.csv')
      render(
        <FileUpload
          defaultValue={[march, april, may]}
          onValueChange={onValueChange}
        >
          <FileUpload.List />
        </FileUpload>
      )
      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Remove april.csv' }))
      expect(onValueChange).toHaveBeenLastCalledWith([march, may])
      expect(
        screen.getByRole('button', { name: 'Remove may.csv' })
      ).toHaveFocus()
      await user.click(screen.getByRole('button', { name: 'Remove may.csv' }))
      expect(onValueChange).toHaveBeenLastCalledWith([march])
      expect(
        screen.getByRole('button', { name: 'Remove march.csv' })
      ).toHaveFocus()
      await waitFor(() =>
        expect(screen.getAllByRole('listitem')).toHaveLength(1)
      )
    })

    it('moves focus to the dropzone when the last file goes', async () => {
      render(<FileUpload defaultValue={[csv()]} />)
      await userEvent.click(
        screen.getByRole('button', { name: 'Remove payments.csv' })
      )
      expect(screen.getByRole('button', { name: /^Drop a file/ })).toHaveFocus()
      await waitFor(() => expect(screen.queryByRole('list')).toBeNull())
    })

    it('drops a removed row at once when it is not a FileUpload.Item', async () => {
      render(
        <FileUpload defaultValue={[csv()]}>
          <FileUpload.List>
            {({ file }) => <li>{file.name}</li>}
          </FileUpload.List>
          <FileUpload.Clear />
        </FileUpload>
      )
      await userEvent.click(
        screen.getByRole('button', { name: 'Remove payments.csv' })
      )
      await waitFor(() => expect(screen.queryByRole('list')).toBeNull())
    })

    it('empties the value with Clear', async () => {
      const onValueChange = vi.fn()
      render(
        <FileUpload defaultValue={[csv()]} onValueChange={onValueChange}>
          <FileUpload.List />
          <FileUpload.Clear />
        </FileUpload>
      )
      await userEvent.click(
        screen.getAllByRole('button', { name: 'Remove payments.csv' })[1]!
      )
      expect(onValueChange).toHaveBeenCalledWith([])
      await waitFor(() => expect(screen.queryByRole('list')).toBeNull())
    })
  })

  describe('several files', () => {
    const files = (count: number) =>
      Array.from({ length: count }, (_, index) => csv(`set-${index + 1}.csv`))

    it('adds picks to the files, and turns away a seventh over maxFiles={6}', async () => {
      const onValueChange = vi.fn()
      const onReject = vi.fn()
      const six = files(6)
      const { container } = render(
        <Field>
          <Field.Label>Event documents</Field.Label>
          <FileUpload
            maxFiles={6}
            onValueChange={onValueChange}
            onReject={onReject}
          />
          <Field.ErrorText />
        </Field>
      )
      const input = fileInput(container)
      expect(input).toHaveAttribute('multiple')
      const user = userEvent.setup()
      await user.upload(input, six.slice(0, 4))
      expect(onValueChange).toHaveBeenLastCalledWith(six.slice(0, 4))
      expect(
        screen.getByRole('button', {
          name: /Drop files, or choose them 4 of 6/
        })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('list', { name: 'Event documents' })
      ).toBeInTheDocument()

      const seventh = csv('set-7.csv')
      await user.upload(input, [...six.slice(4), seventh])
      expect(onValueChange).toHaveBeenLastCalledWith(six)
      expect(onReject).toHaveBeenCalledWith([
        expect.objectContaining({ file: seventh, code: 'too-many' })
      ])
      expect(
        await screen.findByText(
          "set-7.csv wasn't added, as the field takes up to 6 files."
        )
      ).toBeInTheDocument()
    })

    it('reorders the files from the Move menu', async () => {
      const onValueChange = vi.fn()
      const [first, second, third] = files(3) as [File, File, File]
      render(
        <FileUpload
          maxFiles={6}
          defaultValue={[first, second, third]}
          onValueChange={onValueChange}
        />
      )
      const user = userEvent.setup()
      await user.click(
        screen.getByRole('button', { name: 'Reorder set-1.csv' })
      )
      await user.click(
        await screen.findByRole('menuitem', { name: 'Move set-1.csv down' })
      )
      expect(onValueChange).toHaveBeenLastCalledWith([second, first, third])
      expect(
        screen.getAllByRole('listitem').map((row) => row.textContent)
      ).toEqual([
        expect.stringContaining('set-2.csv'),
        expect.stringContaining('set-1.csv'),
        expect.stringContaining('set-3.csv')
      ])
    })

    it('leaves a single-file list without handles, even inside a Sortable', () => {
      render(
        <Sortable items={['row']} onReorder={() => {}}>
          <Sortable.Item value='row' label='row'>
            <FileUpload defaultValue={[csv()]} />
          </Sortable.Item>
        </Sortable>
      )
      expect(screen.queryByRole('button', { name: /^Reorder/ })).toBeNull()
    })

    it('keeps a rejection showing while the files are reordered', async () => {
      const [first, second] = files(2) as [File, File]
      const { container } = render(
        <Field>
          <Field.Label>Event documents</Field.Label>
          <FileUpload maxFiles={2} defaultValue={[first, second]} />
          <Field.ErrorText />
        </Field>
      )
      const user = userEvent.setup()
      await user.upload(fileInput(container), csv('extra.csv'))
      const message =
        "extra.csv wasn't added, as the field takes up to 2 files."
      expect(await screen.findByText(message)).toBeInTheDocument()
      await user.click(
        screen.getByRole('button', { name: 'Reorder set-1.csv' })
      )
      await user.click(
        await screen.findByRole('menuitem', { name: 'Move set-1.csv down' })
      )
      expect(screen.getByText(message)).toBeInTheDocument()
    })

    it("doesn't open the picker once the field is full, and says so", async () => {
      const { container } = render(
        <FileUpload maxFiles={2} defaultValue={files(2)}>
          <FileUpload.Dropzone />
          <FileUpload.Trigger />
          <FileUpload.List />
        </FileUpload>
      )
      const click = vi.spyOn(fileInput(container), 'click')
      const zone = screen.getByRole('button', {
        name: 'Remove a file to add another 2 of 2'
      })
      const trigger = screen.getByRole('button', { name: 'Choose files' })
      expect(zone).toHaveAttribute('aria-disabled', 'true')
      expect(trigger).toHaveAttribute('aria-disabled', 'true')
      expect(container.firstElementChild).toHaveAttribute('data-full')
      const user = userEvent.setup()
      await user.click(zone)
      zone.focus()
      await user.keyboard('{Enter} ')
      // Disabled but still focusable, so the reason can be found.
      trigger.focus()
      expect(trigger).toHaveFocus()
      await user.keyboard('{Enter}')
      expect(click).not.toHaveBeenCalled()

      await user.click(screen.getByRole('button', { name: 'Remove set-1.csv' }))
      expect(zone).not.toHaveAttribute('aria-disabled')
      expect(trigger).not.toHaveAttribute('aria-disabled')
      await user.click(trigger)
      expect(click).toHaveBeenCalled()
    })

    it('keeps a collapsing row under the file above it after a reorder', async () => {
      // Collapses that never finish, so the removed row stays.
      // jsdom has no getAnimations.
      HTMLElement.prototype.getAnimations = () => [
        { finished: new Promise(() => {}) } as unknown as Animation
      ]
      onTestFinished(() => {
        delete (HTMLElement.prototype as Partial<HTMLElement>).getAnimations
      })
      render(<FileUpload maxFiles={6} defaultValue={files(3)} />)
      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Remove set-2.csv' }))
      await user.click(
        screen.getByRole('button', { name: 'Reorder set-1.csv' })
      )
      await user.click(
        await screen.findByRole('menuitem', { name: 'Move set-1.csv down' })
      )
      const order = [
        ...document.querySelectorAll('[data-slot=file-upload-item-name]')
      ].map((name) => name.textContent)
      expect(order).toEqual(['set-3.csv', 'set-1.csv', 'set-2.csv'])
    })

    it('keeps a collapsing row under the row above it when that one goes too', async () => {
      // Collapses that never finish, so the removed rows stay.
      HTMLElement.prototype.getAnimations = () => [
        { finished: new Promise(() => {}) } as unknown as Animation
      ]
      onTestFinished(() => {
        delete (HTMLElement.prototype as Partial<HTMLElement>).getAnimations
      })
      render(<FileUpload maxFiles={6} defaultValue={files(3)} />)
      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Remove set-2.csv' }))
      await user.click(screen.getByRole('button', { name: 'Remove set-1.csv' }))
      const order = [
        ...document.querySelectorAll('[data-slot=file-upload-item-name]')
      ].map((name) => name.textContent)
      expect(order).toEqual(['set-1.csv', 'set-2.csv', 'set-3.csv'])
    })

    it('reads Choose files on the Trigger', () => {
      render(
        <FileUpload maxFiles={3} defaultValue={[csv()]}>
          <FileUpload.Trigger />
        </FileUpload>
      )
      expect(
        screen.getByRole('button', { name: /Choose files$/ })
      ).toBeInTheDocument()
    })
  })

  it('warns when a second field on the page has pageDrop', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { rerender } = render(<FileUpload pageDrop />)
    expect(warn).not.toHaveBeenCalled()
    rerender(
      <>
        <FileUpload pageDrop />
        <FileUpload pageDrop />
      </>
    )
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('only one FileUpload on a page can have pageDrop')
    )
    warn.mockRestore()
  })
})
