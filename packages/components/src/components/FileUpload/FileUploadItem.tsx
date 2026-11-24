'use client'

import {
  type ComponentProps,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react'

import { XIcon } from '@phosphor-icons/react'

import { cn } from '@oztix/roadie-core/utils'

import { IconButton, type IconButtonProps } from '../Button'
import { useFileUploadContext, useFileUploadItem } from './FileUploadContext'
import { formatFileSize } from './checkFile'

export type FileUploadItemProps = ComponentProps<'div'>

/**
 * One file's row in `FileUpload.List`. It pops in, staggered after the files
 * added with it, and once removed it fades and collapses before it goes.
 * `className` styles the row; the list item around it does the collapse.
 */
export function FileUploadItem({
  className,
  style,
  ...props
}: FileUploadItemProps) {
  const {
    item: { id },
    leaving,
    enterIndex,
    onLeft,
    claim
  } = useFileUploadItem('FileUpload.Item')
  const itemRef = useRef<HTMLLIElement>(null)
  // Fixed at mount: a later change would replay the pop-in.
  const [delay] = useState(enterIndex)
  useLayoutEffect(() => {
    claim(id)
  }, [claim, id])

  useEffect(() => {
    const item = itemRef.current
    if (!leaving || !item) return
    let live = true
    const done = () => live && onLeft()
    // The collapse is a CSS transition; reduced motion shortens it to nothing.
    // Where nothing animates, such as jsdom, the row goes at once, and so it
    // does when the transition is cancelled, such as by a closing dialog.
    Promise.all(
      (item.getAnimations?.() ?? []).map(({ finished }) => finished)
    ).then(done, done)
    return () => {
      live = false
    }
  }, [leaving, onLeft])

  return (
    <li
      ref={itemRef}
      data-slot='file-upload-item'
      data-leaving={leaving || undefined}
      inert={leaving}
      className='grid grid-rows-[1fr] pb-2 transition-[grid-template-rows,padding-bottom,opacity] duration-slow ease-spring last:pb-0 data-leaving:grid-rows-[0fr] data-leaving:overflow-hidden data-leaving:pb-0 data-leaving:opacity-0'
    >
      {/* Unpadded, so the row's padding and border collapse with it. */}
      <div className='min-h-0'>
        <div
          className={cn(
            'flex h-full origin-top animate-pop-in items-center gap-3 rounded-xl emphasis-normal p-2',
            className
          )}
          style={{
            animationDelay: `calc(var(--stagger-base) * ${delay})`,
            ...style
          }}
          {...props}
        />
      </div>
    </li>
  )
}

FileUploadItem.displayName = 'FileUpload.Item'

export type FileUploadItemNameProps = ComponentProps<'span'>

/** The file's name, cut short with an ellipsis when it's long. */
export function FileUploadItemName({
  className,
  ...props
}: FileUploadItemNameProps) {
  const { item } = useFileUploadItem('FileUpload.ItemName')
  return (
    <span
      data-slot='file-upload-item-name'
      className={cn('truncate text-strong', className)}
      {...props}
    >
      {item.file.name}
    </span>
  )
}

FileUploadItemName.displayName = 'FileUpload.ItemName'

export type FileUploadItemSizeProps = ComponentProps<'span'>

/** The file's size, such as "2 kB". */
export function FileUploadItemSize({
  className,
  ...props
}: FileUploadItemSizeProps) {
  const { item } = useFileUploadItem('FileUpload.ItemSize')
  return (
    <span
      data-slot='file-upload-item-size'
      className={cn('text-sm text-subtle', className)}
      {...props}
    >
      {formatFileSize(item.file.size)}
    </span>
  )
}

FileUploadItemSize.displayName = 'FileUpload.ItemSize'

export type FileUploadItemRemoveProps = Omit<IconButtonProps, 'aria-label'> & {
  'aria-label'?: string
}

/**
 * Takes the file out of the value. Focus moves to the next row's Remove, the
 * previous row's when it was the last, or the Dropzone or Trigger.
 */
export function FileUploadItemRemove({
  onClick,
  children,
  ...props
}: FileUploadItemRemoveProps) {
  const { remove, disabled, triggerRef } = useFileUploadContext(
    'FileUpload.ItemRemove'
  )
  const { item } = useFileUploadItem('FileUpload.ItemRemove')
  return (
    <IconButton
      data-slot='file-upload-item-remove'
      size='sm'
      emphasis='subtler'
      aria-label={`Remove ${item.file.name}`}
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        const removes = [
          ...(event.currentTarget
            .closest('[data-slot=file-upload-list]')
            ?.querySelectorAll<HTMLElement>(
              'li:not([data-leaving]) [data-slot=file-upload-item-remove]'
            ) ?? [])
        ]
        const at = removes.indexOf(event.currentTarget)
        const next = removes[at + 1] ?? removes[at - 1]
        remove(item.file)
        const target = next ?? triggerRef.current
        target?.focus({ preventScroll: true })
      }}
      {...props}
    >
      {children ?? <XIcon weight='bold' className='size-4' />}
    </IconButton>
  )
}

FileUploadItemRemove.displayName = 'FileUpload.ItemRemove'
