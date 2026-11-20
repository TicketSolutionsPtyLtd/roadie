'use client'

import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { FileUploadInControl, useFileUploadContext } from './FileUploadContext'

export type FileUploadControlProps = ComponentProps<'div'>

/** The bar that holds Value, Clear and Trigger, styled as a text field, with the Trigger joined to its end. */
export function FileUploadControl({
  className,
  children,
  ...props
}: FileUploadControlProps) {
  const { invalid, disabled } = useFileUploadContext('FileUpload.Control')
  return (
    <div
      data-slot='file-upload-control'
      aria-invalid={invalid || undefined}
      data-disabled={disabled || undefined}
      className={cn(
        'flex h-10 w-full min-w-0 items-center gap-1 justify-self-stretch rounded-lg emphasis-field font-sans text-base is-interactive-field-group',
        className
      )}
      {...props}
    >
      <FileUploadInControl value>{children}</FileUploadInControl>
    </div>
  )
}

FileUploadControl.displayName = 'FileUpload.Control'
