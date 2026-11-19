'use client'

import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { useFileUploadContext } from './FileUploadContext'

export type FileUploadControlProps = ComponentProps<'div'>

/** The bar that holds Value, Clear and Trigger, styled as a text field. */
export function FileUploadControl({
  className,
  ...props
}: FileUploadControlProps) {
  const { invalid, disabled } = useFileUploadContext('FileUpload.Control')
  return (
    <div
      data-slot='file-upload-control'
      aria-invalid={invalid || undefined}
      data-disabled={disabled || undefined}
      className={cn(
        'flex h-10 w-full min-w-0 items-center gap-1 justify-self-stretch rounded-lg emphasis-field pr-1 font-sans text-base is-interactive-field-group',
        className
      )}
      {...props}
    />
  )
}

FileUploadControl.displayName = 'FileUpload.Control'
