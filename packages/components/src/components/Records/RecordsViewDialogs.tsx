'use client'

import {
  type FormEvent,
  type ReactNode,
  type RefObject,
  useId,
  useRef,
  useState
} from 'react'

import { XIcon } from '@phosphor-icons/react'

import { usePickerSurface } from '../../pickers/PickerShell'
import { Button, IconButton } from '../Button'
import { Dialog } from '../Dialog'
import { Drawer } from '../Drawer'
import { Field } from '../Field'
import { reportActionError } from './RecordsConfirm'

export type ViewDialog = 'save-as' | 'rename' | 'delete'

const COPY = {
  'save-as': {
    title: 'Save as new view',
    submit: 'Save view',
    failed: 'The view wasn’t saved. Try again.'
  },
  rename: {
    title: 'Rename view',
    submit: 'Rename',
    failed: 'The view wasn’t renamed. Try again.'
  },
  delete: {
    title: '',
    submit: 'Delete view',
    failed: 'The view wasn’t deleted. Try again.'
  }
} satisfies Record<
  ViewDialog,
  { title: string; submit: string; failed: string }
>

// An app rejects with a message people can read, such as a name already taken.
const messageOf = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback

/** Runs a handler once at a time, holding its failure as a message. */
function useRun(failed: string, onDone: () => void) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const running = useRef(false)
  const run = async (action: () => void | Promise<void>) => {
    if (running.current) return
    running.current = true
    setPending(true)
    setError(null)
    try {
      await action()
      onDone()
    } catch (caught) {
      reportActionError(caught)
      setError(messageOf(caught, failed))
    } finally {
      running.current = false
      setPending(false)
    }
  }
  return { pending, error, setError, run }
}

type SurfaceProps = {
  role?: 'alertdialog'
  intent?: 'danger'
  title: string
  description?: ReactNode
  body?: ReactNode
  actions: ReactNode
  initialFocus?: () => HTMLElement | null
  finalFocus: RefObject<HTMLElement | null>
  onClose: () => void
}

/** A dialog, or a bottom drawer on a phone where the keyboard takes the lower half. */
function ViewSurface({
  role,
  intent,
  title,
  description,
  body,
  actions,
  initialFocus,
  finalFocus,
  onClose
}: SurfaceProps) {
  const surface = usePickerSurface(true)
  const onOpenChange = (open: boolean) => {
    if (!open) onClose()
  }
  const focus = initialFocus && (() => initialFocus() ?? true)
  if (surface === 'drawer')
    return (
      <Drawer open onOpenChange={onOpenChange}>
        <Drawer.Content
          // An undefined role would replace the popup's own 'dialog'.
          {...(role && { role })}
          intent={intent}
          initialFocus={focus}
          finalFocus={finalFocus}
        >
          <Drawer.Header>
            <Drawer.Close
              render={
                <IconButton aria-label='Close' emphasis='normal'>
                  <XIcon weight='bold' className='size-5' />
                </IconButton>
              }
            />
            <Drawer.Title>{title}</Drawer.Title>
            {description && (
              <Drawer.Description>{description}</Drawer.Description>
            )}
          </Drawer.Header>
          {body && <Drawer.Body>{body}</Drawer.Body>}
          <Drawer.Footer className='grid grid-cols-2'>{actions}</Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    )
  return (
    <Dialog role={role} open onOpenChange={onOpenChange}>
      <Dialog.Content
        intent={intent}
        size='sm'
        initialFocus={focus}
        finalFocus={finalFocus}
      >
        <Dialog.Header>
          <Dialog.Title>{title}</Dialog.Title>
          {description && (
            <Dialog.Description>{description}</Dialog.Description>
          )}
        </Dialog.Header>
        {body}
        <Dialog.Footer>{actions}</Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  )
}

export type RecordsViewNameProps = {
  kind: 'save-as' | 'rename'
  initialName: string
  finalFocus: RefObject<HTMLElement | null>
  onClose: () => void
  onSubmit: (name: string) => void | Promise<void>
}

/** Asks for a view's name, for Save as new view and Rename view. */
export function RecordsViewName({
  kind,
  initialName,
  finalFocus,
  onClose,
  onSubmit
}: RecordsViewNameProps) {
  const copy = COPY[kind]
  const formId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(initialName)
  const [empty, setEmpty] = useState(false)
  const { pending, error, setError, run } = useRun(copy.failed, onClose)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    setEmpty(trimmed === '')
    if (trimmed === '') return
    void run(() => onSubmit(trimmed))
  }
  const message = empty ? 'Enter a name' : error

  return (
    <ViewSurface
      title={copy.title}
      finalFocus={finalFocus}
      onClose={onClose}
      initialFocus={() => {
        // A rename starts from the whole name selected, ready to retype.
        inputRef.current?.select()
        return inputRef.current
      }}
      body={
        <form id={formId} noValidate onSubmit={submit}>
          <Field invalid={message !== null} required>
            <Field.Label>Name</Field.Label>
            <Field.Input
              ref={inputRef}
              value={name}
              autoComplete='off'
              onChange={(event) => {
                setName(event.target.value)
                setEmpty(false)
                setError(null)
              }}
            />
            <Field.ErrorText>{message}</Field.ErrorText>
          </Field>
        </form>
      }
      actions={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type='submit'
            form={formId}
            emphasis='strong'
            disabled={pending}
            focusableWhenDisabled
            aria-busy={pending || undefined}
          >
            {copy.submit}
          </Button>
        </>
      }
    />
  )
}

export type RecordsViewDeleteProps = {
  name: string
  finalFocus: RefObject<HTMLElement | null>
  onClose: () => void
  onConfirm: () => void | Promise<void>
}

export function RecordsViewDelete({
  name,
  finalFocus,
  onClose,
  onConfirm
}: RecordsViewDeleteProps) {
  const copy = COPY.delete
  const { pending, error, run } = useRun(copy.failed, onClose)
  return (
    <ViewSurface
      role='alertdialog'
      intent='danger'
      title={`Delete ${name}?`}
      description='The records stay. Only the saved view goes.'
      finalFocus={finalFocus}
      onClose={onClose}
      body={
        error && (
          <p role='alert' className='text-sm text-subtle intent-danger'>
            {error}
          </p>
        )
      }
      actions={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            intent='danger'
            emphasis='strong'
            disabled={pending}
            focusableWhenDisabled
            aria-busy={pending || undefined}
            onClick={() => void run(onConfirm)}
          >
            {copy.submit}
          </Button>
        </>
      }
    />
  )
}
