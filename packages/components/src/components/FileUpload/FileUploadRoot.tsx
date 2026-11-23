'use client'

import {
  type ComponentProps,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { useFieldContext, useFieldControlError } from '../Field/FieldContext'
import { FileUploadContext } from './FileUploadContext'
import { FileUploadDropzone } from './FileUploadDropzone'
import {
  type FileRules,
  type FileUploadRejection,
  checkFile
} from './checkFile'

export type FileUploadRootProps = Omit<
  ComponentProps<'div'>,
  'defaultValue' | 'onChange'
> &
  FileRules & {
    /** The form field name the files post under. */
    name?: string
    /** The chosen files, when you control them. */
    value?: File[]
    /** The files to start with, when the field controls them. */
    defaultValue?: File[]
    /** Called with the new files once a pick passes every rule. */
    onValueChange?: (files: File[]) => void
    /** Called with the files a pick turned away, each with its code and message. */
    onReject?: (rejections: FileUploadRejection[]) => void
    /** Which camera a phone opens instead of its file picker. Passed to the native input. */
    capture?: 'user' | 'environment'
    disabled?: boolean
    required?: boolean
  }

/**
 * A file field. It holds the chosen files and keeps a native file input in
 * step with them, so a form posts them under `name`. With no children it
 * renders a Dropzone. Files can also be dropped on a Control, or pasted
 * anywhere inside.
 */
export function FileUploadRoot({
  name,
  value,
  defaultValue,
  onValueChange,
  accept,
  maxFileSize,
  minFileSize,
  onReject,
  capture,
  disabled,
  required,
  className,
  children,
  onPaste,
  ...props
}: FileUploadRootProps) {
  const field = useFieldContext()
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? [])
  const files = value ?? uncontrolled
  const [error, setError] = useState<string | null>(null)
  useFieldControlError(error)
  const inputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLElement>(null)
  const ownId = useId()
  const inputId = field.fieldId || `${ownId}-input`

  const syncInput = useCallback(() => {
    const input = inputRef.current
    // jsdom has no DataTransfer.
    if (!input || typeof DataTransfer === 'undefined') return
    const transfer = new DataTransfer()
    for (const file of files) transfer.items.add(file)
    input.files = transfer.files
  }, [files])
  useEffect(syncInput, [syncInput])

  // Picks, drops and pastes all come through here. One file for now: the first.
  function take(picked: ArrayLike<File>) {
    const file = picked[0]
    const rejection =
      file && checkFile(file, { accept, maxFileSize, minFileSize })
    if (rejection) {
      setError(rejection.message)
      onReject?.([rejection])
    } else if (file) commit([file])
    // The input shows only the value; an accepted pick reaches it on re-render.
    syncInput()
  }

  function commit(next: File[]) {
    setError(null)
    setUncontrolled(next)
    onValueChange?.(next)
  }

  const isDisabled = Boolean(disabled || field.disabled)
  const invalid = Boolean(field.invalid) || error !== null
  const describedBy = invalid ? field.errorTextId : field.helperTextId

  return (
    <div
      data-slot='file-upload'
      data-disabled={isDisabled || undefined}
      data-invalid={invalid || undefined}
      className={cn('grid justify-items-start gap-2', className)}
      onPaste={(event) => {
        onPaste?.(event)
        const pasted = event.clipboardData.files
        const target = event.target as HTMLElement
        // A text field inside keeps its paste, such as cells copied with an image.
        const editable =
          target.isContentEditable || target.matches('input, textarea')
        if (event.defaultPrevented || isDisabled || editable || !pasted.length)
          return
        event.preventDefault()
        take(pasted)
      }}
      {...props}
    >
      <FileUploadContext
        value={{
          files,
          take,
          open: () => inputRef.current?.click(),
          clear: () => {
            commit([])
            triggerRef.current?.focus()
          },
          inputId,
          valueId: `${ownId}-value`,
          triggerRef,
          disabled: isDisabled,
          invalid,
          labelId: field.labelId || undefined,
          describedBy: describedBy || undefined
        }}
      >
        {children ?? <FileUploadDropzone />}
      </FileUploadContext>
      <input
        ref={inputRef}
        type='file'
        id={inputId}
        name={name}
        accept={accept}
        capture={capture}
        required={Boolean(required || field.required)}
        disabled={isDisabled}
        tabIndex={-1}
        aria-hidden
        className='sr-only'
        onChange={(event) => take(event.currentTarget.files ?? [])}
        // The browser focuses an empty required input when a form submits.
        onFocus={() => triggerRef.current?.focus()}
      />
    </div>
  )
}

FileUploadRoot.displayName = 'FileUpload.Root'
