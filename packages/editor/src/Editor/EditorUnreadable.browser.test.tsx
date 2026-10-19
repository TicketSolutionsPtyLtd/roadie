import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Field } from '@oztix/roadie-components/field'

import { Editor } from '.'
import type { EditorValue } from '../schema'

// migrate keeps the editor from meeting content it can't read, so this skips
// it to reach the editor's own guard.
vi.mock('../schema/value', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../schema/value')>()),
  migrate: (value: EditorValue) => value
}))

const unreadable: EditorValue = {
  version: 1,
  preset: 'basic',
  doc: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', marks: [{ type: 'strike' }], text: 'Sold out' }
        ]
      }
    ]
  }
}

describe('Editor with content its schema can’t read', () => {
  it('stays read-only with an error, saving nothing over the stored value', async () => {
    const onValueChange = vi.fn()
    let submitted: FormData | undefined
    render(
      <form
        onSubmit={(event) => {
          event.preventDefault()
          submitted = new FormData(event.currentTarget)
        }}
      >
        <Field>
          <Field.Label>Event description</Field.Label>
          <Editor
            name='description'
            defaultValue={unreadable}
            onValueChange={onValueChange}
          />
          <Field.ErrorText />
        </Field>
        <button type='submit'>Save</button>
      </form>
    )
    const textbox = await screen.findByRole('textbox', {
      name: 'Event description'
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'couldn’t be loaded'
    )
    expect(textbox).toHaveAttribute('contenteditable', 'false')
    expect(textbox).toHaveAttribute('aria-readonly', 'true')

    await userEvent.click(textbox)
    await userEvent.keyboard('Doors 7pm')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onValueChange).not.toHaveBeenCalled()
    expect(JSON.parse(submitted!.get('description') as string)).toEqual(
      unreadable
    )
  })

  it('shows its own error outside a Field', async () => {
    render(<Editor aria-label='Event description' defaultValue={unreadable} />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'couldn’t be loaded'
    )
  })
})
