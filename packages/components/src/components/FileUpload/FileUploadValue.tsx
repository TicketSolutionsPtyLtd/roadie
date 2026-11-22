'use client'

import { type ComponentProps, use } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { FileUploadInControl, useFileUploadContext } from './FileUploadContext'
import { formatFileSize } from './checkFile'

export type FileUploadValueProps = Omit<
  ComponentProps<'label'>,
  'id' | 'htmlFor'
> & {
  /** What it says before a file is chosen. */
  placeholder?: string
}

/**
 * The chosen file's name and size. It's a label for the hidden file input,
 * so clicking it opens the picker without adding a focus stop.
 */
export function FileUploadValue({
  placeholder = 'No file chosen',
  className,
  ...props
}: FileUploadValueProps) {
  const { files, inputId, valueId } = useFileUploadContext('FileUpload.Value')
  const [file] = files
  const dragging = use(FileUploadInControl)?.dragging
  return (
    <label
      data-slot='file-upload-value'
      className={cn(
        'flex min-w-0 flex-1 cursor-pointer items-center gap-2 self-stretch pl-3',
        className
      )}
      {...props}
      // The Trigger names itself by this id, and the label opens the picker.
      id={valueId}
      htmlFor={inputId}
    >
      {dragging ? (
        <span className='truncate text-strong'>Drop to add</span>
      ) : file ? (
        <>
          <span className='truncate text-normal'>{file.name}</span>{' '}
          <span className='shrink-0 text-sm text-subtle'>
            {formatFileSize(file.size)}
          </span>
        </>
      ) : (
        <span className='truncate text-subtler'>{placeholder}</span>
      )}
    </label>
  )
}

FileUploadValue.displayName = 'FileUpload.Value'
