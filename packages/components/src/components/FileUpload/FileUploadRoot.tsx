'use client'

import {
  type ChangeEvent,
  type ComponentProps,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { useFieldContext, useFieldControlError } from '../Field/FieldContext'
import { FileUploadContext } from './FileUploadContext'
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
 * step with them, so a form posts them under `name`.
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
  ...props
}: FileUploadRootProps) {
  const field = useFieldContext()
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? [])
  const files = value ?? uncontrolled
  const [error, setError] = useState<string | null>(null)
  useFieldControlError(error)
  const inputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLElement>(null)

  const syncInput = useCallback(() => {
    const input = inputRef.current
    // jsdom has no DataTransfer.
    if (!input || typeof DataTransfer === 'undefined') return
    const transfer = new DataTransfer()
    for (const file of files) transfer.items.add(file)
    input.files = transfer.files
  }, [files])
  useEffect(syncInput, [syncInput])

  function pick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    const rejection =
      file && checkFile(file, { accept, maxFileSize, minFileSize })
    if (rejection) {
      setError(rejection.message)
      onReject?.([rejection])
    } else if (file) {
      setError(null)
      setUncontrolled([file])
      onValueChange?.([file])
    }
    // The input shows only the value; an accepted pick reaches it on re-render.
    syncInput()
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
      {...props}
    >
      <FileUploadContext
        value={{
          open: () => inputRef.current?.click(),
          triggerRef,
          disabled: isDisabled,
          invalid,
          labelId: field.labelId || undefined,
          describedBy: describedBy || undefined
        }}
      >
        {children}
      </FileUploadContext>
      <input
        ref={inputRef}
        type='file'
        id={field.fieldId || undefined}
        name={name}
        accept={accept}
        capture={capture}
        required={Boolean(required || field.required)}
        disabled={isDisabled}
        tabIndex={-1}
        aria-hidden
        className='sr-only'
        onChange={pick}
        // The browser focuses an empty required input when a form submits.
        onFocus={() => triggerRef.current?.focus()}
      />
    </div>
  )
}

FileUploadRoot.displayName = 'FileUpload.Root'
