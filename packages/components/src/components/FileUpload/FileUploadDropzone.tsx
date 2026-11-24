'use client'

import { type ComponentProps, type ReactNode, useId, useRef } from 'react'

import { CloudArrowUpIcon } from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

import { mergeRefs } from '../../utils/mergeRefs'
import { IconTile } from '../IconTile'
import { useFileUploadContext } from './FileUploadContext'
import { useFileDrop } from './useFileDrop'

export type FileUploadDropzoneProps = Omit<ComponentProps<'div'>, 'title'> & {
  /** What it asks for. */
  title?: ReactNode
}

/**
 * The area files are dropped on. It's also a button: a click, Enter or Space
 * opens the picker, so never put a Trigger inside it. Its icon tile lifts
 * while files are over it. `FileUpload.List` shows the chosen files.
 */
export function FileUploadDropzone({
  id,
  ref,
  title = 'Drop a file, or choose one',
  className,
  children,
  onClick,
  onKeyDown,
  onKeyUp,
  ...props
}: FileUploadDropzoneProps) {
  const context = useFileUploadContext('FileUpload.Dropzone')
  const ownRef = useRef<HTMLDivElement>(null)
  const dragging = useFileDrop(ownRef, 'FileUpload.Dropzone')
  const ownId = useId()
  const zoneId = id ?? ownId
  return (
    <div
      ref={mergeRefs(ref, ownRef, context.triggerRef)}
      id={zoneId}
      role='button'
      tabIndex={context.disabled ? undefined : 0}
      data-slot='file-upload-dropzone'
      data-dragging={dragging || undefined}
      aria-disabled={context.disabled || undefined}
      // The field's label first, then what the zone asks for and holds.
      aria-labelledby={[context.labelId, zoneId].filter(Boolean).join(' ')}
      aria-describedby={context.describedBy}
      aria-invalid={context.invalid || undefined}
      className={cn(
        'group grid w-full justify-items-center gap-2 justify-self-stretch rounded-xl border border-dashed emphasis-subtler border-normal px-4 py-8 text-center is-interactive aria-invalid:intent-danger data-dragging:border-solid data-dragging:emphasis-subtle data-dragging:border-strong data-dragging:intent-accent',
        className
      )}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented && !context.disabled) context.open()
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (event.target !== event.currentTarget) return
        // Like a native button: Enter opens at once, Space on release.
        if (event.key === ' ') event.preventDefault()
        if (event.key === 'Enter' && !context.disabled) context.open()
      }}
      onKeyUp={(event) => {
        onKeyUp?.(event)
        if (event.key === ' ' && event.target === event.currentTarget) {
          if (!context.disabled) context.open()
        }
      }}
      {...props}
    >
      <IconTile
        size='lg'
        intent='accent'
        className='transition-transform duration-slow ease-spring-lively group-data-dragging:-translate-y-1.5 group-data-dragging:scale-108'
      >
        <CloudArrowUpIcon weight='bold' />
      </IconTile>
      <p className='text-display-ui-6 text-strong'>{title}</p>
      {children}
    </div>
  )
}

FileUploadDropzone.displayName = 'FileUpload.Dropzone'
