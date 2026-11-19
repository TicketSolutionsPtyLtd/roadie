'use client'

import { useId } from 'react'

import { mergeRefs } from '../../utils/mergeRefs'
import { Button, type ButtonProps } from '../Button'
import { useFileUploadContext } from './FileUploadContext'

export type FileUploadTriggerProps = Omit<
  ButtonProps,
  'href' | 'external' | 'target' | 'rel' | 'download'
>

/** The button that opens the file picker. It reads "Choose file", or "Replace" once there's one. */
export function FileUploadTrigger({
  id,
  ref,
  disabled,
  onClick,
  children,
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
      // The field's label and the chosen file come first, then what the button does.
      aria-labelledby={[context.labelId, context.valueId, triggerId]
        .filter(Boolean)
        .join(' ')}
      aria-describedby={context.describedBy}
      aria-invalid={context.invalid || undefined}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) context.open()
      }}
      {...props}
    >
      {children ?? (context.files.length ? 'Replace' : 'Choose file')}
    </Button>
  )
}

FileUploadTrigger.displayName = 'FileUpload.Trigger'
