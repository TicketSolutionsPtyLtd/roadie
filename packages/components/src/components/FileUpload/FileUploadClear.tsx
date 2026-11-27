'use client'

import { XIcon } from '@phosphor-icons/react'

import { IconButton, type IconButtonProps } from '../Button'
import { useFileUploadContext } from './FileUploadContext'

export type FileUploadClearProps = Omit<IconButtonProps, 'aria-label'> & {
  'aria-label'?: string
}

/** Empties the value. It shows only while there's a file. */
export function FileUploadClear({ onClick, ...props }: FileUploadClearProps) {
  const { files, clear, disabled } = useFileUploadContext('FileUpload.Clear')
  const [file] = files
  if (!file) return null
  return (
    <IconButton
      data-slot='file-upload-clear'
      size='sm'
      emphasis='subtler'
      aria-label={`Remove ${file.name}`}
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) clear()
      }}
      {...props}
    >
      <XIcon weight='bold' className='size-4' />
    </IconButton>
  )
}

FileUploadClear.displayName = 'FileUpload.Clear'
