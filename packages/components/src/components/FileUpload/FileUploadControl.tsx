'use client'

import { type ComponentProps, useRef } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { mergeRefs } from '../../utils/mergeRefs'
import { FileUploadInControl, useFileUploadContext } from './FileUploadContext'
import { useFileDrop } from './useFileDrop'

export type FileUploadControlProps = ComponentProps<'div'>

/**
 * The bar that holds Value, Clear and Trigger, styled as a text field, with
 * the Trigger joined to its end. It takes dropped files too.
 */
export function FileUploadControl({
  ref,
  className,
  children,
  ...props
}: FileUploadControlProps) {
  const { invalid, disabled } = useFileUploadContext('FileUpload.Control')
  const ownRef = useRef<HTMLDivElement>(null)
  const dragging = useFileDrop(ownRef, 'FileUpload.Control')
  return (
    <div
      ref={mergeRefs(ref, ownRef)}
      data-slot='file-upload-control'
      data-dragging={dragging || undefined}
      aria-invalid={invalid || undefined}
      data-disabled={disabled || undefined}
      className={cn(
        'flex h-10 w-full min-w-0 items-center gap-1 justify-self-stretch rounded-lg emphasis-field font-sans text-base is-interactive-field-group data-dragging:border-strong data-dragging:intent-accent',
        className
      )}
      {...props}
    >
      <FileUploadInControl value={{ dragging }}>{children}</FileUploadInControl>
    </div>
  )
}

FileUploadControl.displayName = 'FileUpload.Control'
