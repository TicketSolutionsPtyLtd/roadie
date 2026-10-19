'use client'

import {
  type InputHTMLAttributes,
  type ReactNode,
  type RefObject,
  use,
  useRef
} from 'react'

import { CheckIcon, TrashIcon, XIcon } from '@phosphor-icons/react'

import { IconButton } from '@oztix/roadie-components/button'
import { Field, useFieldInputProps } from '@oztix/roadie-components/field'
import { Popover } from '@oztix/roadie-components/popover'
import { Separator } from '@oztix/roadie-components/separator'

import { EditorContext } from './EditorContext'
import { EDITOR_TOOLBAR_SIZE } from './variants'

/** Gives `Popover.Content` its one-row width and tighter padding. */
export const EDITOR_POPOVER_CLASS =
  'w-md max-w-[min(28rem,var(--available-width))] p-2'

type InputProps = Pick<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'inputMode' | 'placeholder'
>

type RemoveAction = { label: string; onClick: () => void }

type RowProps = InputProps & {
  label: string
  inputRef: RefObject<HTMLInputElement | null>
  value: string
  onValueChange: (value: string) => void
  submitLabel: string
  canSubmit: boolean
  busy: boolean
  remove?: RemoveAction
}

function Row({
  label,
  inputRef,
  value,
  onValueChange,
  submitLabel,
  canSubmit,
  busy,
  remove,
  ...inputProps
}: RowProps) {
  const fieldProps = useFieldInputProps()
  const size = EDITOR_TOOLBAR_SIZE[use(EditorContext)?.size ?? 'md']
  const opened = useRef(false)
  return (
    <div className='flex items-center gap-1'>
      <input
        ref={inputRef}
        {...fieldProps}
        {...inputProps}
        aria-label={label}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        // The focus the popover opens with selects a saved value, so typing
        // replaces it. Backward, so a long link scrolls to its start.
        onFocus={(event) => {
          if (opened.current) return
          opened.current = true
          const input = event.currentTarget
          input.setSelectionRange(0, input.value.length, 'backward')
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return
          event.preventDefault()
          // The Enter that picks an IME candidate only ends the composition.
          // Safari sends it after compositionend, marked only by keyCode 229.
          const composing =
            event.nativeEvent.isComposing || event.keyCode === 229
          if (!composing) event.currentTarget.form?.requestSubmit()
        }}
        className='min-w-0 flex-1 self-stretch bg-transparent px-2 font-sans text-base outline-none placeholder:text-subtle'
      />
      <Separator orientation='vertical' className='my-1.5' />
      <IconButton
        type='submit'
        size={size}
        emphasis='subtler'
        aria-label={submitLabel}
        disabled={busy || !canSubmit}
        focusableWhenDisabled
      >
        <CheckIcon weight='bold' className='size-4' aria-hidden />
      </IconButton>
      {remove ? (
        <IconButton
          size={size}
          emphasis='subtler'
          aria-label={remove.label}
          onClick={remove.onClick}
        >
          <TrashIcon weight='bold' className='size-4' aria-hidden />
        </IconButton>
      ) : null}
      <Popover.Close
        render={
          <IconButton size={size} emphasis='subtler' aria-label='Close'>
            <XIcon weight='bold' className='size-4' aria-hidden />
          </IconButton>
        }
      />
    </div>
  )
}

type EditorPopoverFormProps = InputProps & {
  /** Names the input, which shows only its placeholder. */
  label: string
  inputRef: RefObject<HTMLInputElement | null>
  value: string
  onValueChange: (value: string) => void
  /** Names the check button. */
  submitLabel: string
  /** Resolves `false` when refused, keeping the popover open with focus in the input. */
  onSubmit: () => boolean | Promise<boolean>
  /** Whether the check can save. Defaults to the input having text. */
  canSubmit?: boolean
  busy?: boolean
  error?: ReactNode
  invalid?: boolean
  /** A Remove button between the check and Close. */
  remove?: RemoveAction
}

/** One row: a bare input, then check, optional Remove, and Close buttons. Enter saves too. */
export function EditorPopoverForm({
  onSubmit,
  canSubmit,
  busy = false,
  error,
  invalid = false,
  ...rowProps
}: EditorPopoverFormProps) {
  const { inputRef, value } = rowProps
  const submittable = canSubmit ?? value.trim() !== ''
  return (
    <form
      noValidate
      onSubmit={async (event) => {
        event.preventDefault()
        if (busy || !submittable) return
        if (!(await onSubmit())) inputRef.current?.focus()
      }}
    >
      <Field invalid={invalid}>
        <Row {...rowProps} canSubmit={submittable} busy={busy} />
        {error ? (
          <Field.ErrorText className='px-2 pb-1'>{error}</Field.ErrorText>
        ) : null}
      </Field>
    </form>
  )
}
