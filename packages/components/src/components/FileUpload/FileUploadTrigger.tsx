'use client'

import { useId } from 'react'

import { mergeRefs } from '../../utils/mergeRefs'
import { Button, type ButtonProps } from '../Button'
import { useFileUploadContext } from './FileUploadContext'

export type FileUploadTriggerProps = Omit<
  ButtonProps,
  'href' | 'external' | 'target' | 'rel' | 'download'
>

/** The button that opens the file picker. */
export function FileUploadTrigger({
  id,
  ref,
  disabled,
  onClick,
  ...props
}: FileUploadTriggerProps) {
  const context = useFileUploadContext('FileUpload.Trigger')
  const ownId = useId()
  const triggerId = id ?? ownId
  return (
    <Button
      data-slot='file-upload-trigger'
      ref={mergeRefs(ref, context.triggerRef)}
      id={triggerId}
      disabled={context.disabled || disabled}
      // Inside a Field, the label names the field and the button says what it does.
      aria-labelledby={
        context.labelId ? `${context.labelId} ${triggerId}` : undefined
      }
      aria-describedby={context.describedBy}
      aria-invalid={context.invalid || undefined}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) context.open()
      }}
      {...props}
    />
  )
}

FileUploadTrigger.displayName = 'FileUpload.Trigger'
