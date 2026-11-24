'use client'

import {
  type ComponentProps,
  cloneElement,
  use,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react'

import { ArrowClockwiseIcon, CheckIcon, XIcon } from '@phosphor-icons/react'

import { cn } from '@oztix/roadie-core/utils'

import {
  Button,
  type ButtonProps,
  IconButton,
  type IconButtonProps
} from '../Button'
import { SortableRootContext } from '../Sortable/SortableContext'
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
  children,
  ...props
}: FileUploadItemProps) {
  const {
    item: { id, file, status, progress },
    leaving,
    enterIndex,
    onLeft,
    claim
  } = useFileUploadItem('FileUpload.Item')
  const itemRef = useRef<HTMLLIElement>(null)
  // Set by `FileUpload.List` when the field takes more than one file.
  const sortable = use(SortableRootContext)
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

  const row = (
    <li
      ref={itemRef}
      data-slot='file-upload-item'
      data-leaving={leaving || undefined}
      inert={leaving}
      className='grid grid-rows-[1fr] pb-2 duration-slow ease-spring last:pb-0 data-leaving:grid-rows-[0fr] data-leaving:overflow-hidden data-leaving:pb-0 data-leaving:opacity-0 motion-safe:transition-[grid-template-rows,padding-bottom,opacity]'
    />
  )
  // Unpadded, so the row's padding and border collapse with it.
  const content = (
    <div className='min-h-0'>
      <div
        className={cn(
          'relative flex h-full origin-top animate-pop-in items-center gap-3 rounded-xl emphasis-normal p-2',
          // No shake: a failed upload isn't the person's mistake.
          status === 'error' && 'intent-danger',
          className
        )}
        style={{
          animationDelay: `calc(var(--stagger-base) * ${delay})`,
          ...style
        }}
        {...props}
      >
        {sortable && <sortable.Handle size='xs' />}
        {children}
        {status === 'uploading' && (
          // A hairline along the row's foot as the file uploads.
          <span
            aria-hidden
            className='absolute inset-x-3 bottom-0 h-0.5 origin-left rounded-full bg-strong transition-[scale] duration-moderate ease-out'
            style={{ scale: `${progress} 1` }}
          />
        )}
      </div>
    </div>
  )
  return sortable ? (
    <sortable.Item value={id} label={file.name} disabled={leaving} render={row}>
      {content}
    </sortable.Item>
  ) : (
    cloneElement(row, undefined, content)
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

export type FileUploadItemStatusProps = ComponentProps<'span'>

/**
 * The file's upload, laid over `FileUpload.ItemPreview`: a ring while it
 * waits and uploads, then a check that pops in once it's done. Renders
 * nothing when `onUpload` isn't uploading the file.
 */
export function FileUploadItemStatus({
  className,
  ...props
}: FileUploadItemStatusProps) {
  const {
    item: { file, status, progress }
  } = useFileUploadItem('FileUpload.ItemStatus')
  if (status !== 'queued' && status !== 'uploading' && status !== 'done')
    return null
  return (
    <span
      data-slot='file-upload-item-status'
      data-status={status}
      className={cn(
        'absolute inset-0 grid place-items-center text-strong group-data-image/preview:text-(--color-neutral-light-0)',
        className
      )}
      {...props}
    >
      {status === 'done' ? (
        <span
          role='img'
          aria-label='Uploaded'
          className='absolute right-1 bottom-1 grid size-5 emphasis-strong place-items-center rounded-full transition-[scale] duration-slow ease-spring-lively intent-success starting:scale-0'
        >
          <CheckIcon weight='bold' className='size-3' />
        </span>
      ) : (
        <svg
          role='progressbar'
          aria-label={`${status === 'queued' ? 'Waiting to upload' : 'Uploading'} ${file.name}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          viewBox='0 0 34 34'
          className='size-8 -rotate-90 fill-none stroke-current stroke-[3.5]'
          strokeLinecap='round'
        >
          <circle cx='17' cy='17' r='14' opacity={0.35} />
          <circle
            cx='17'
            cy='17'
            r='14'
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - progress}
            className='transition-[stroke-dashoffset] duration-moderate ease-out'
          />
        </svg>
      )}
    </span>
  )
}

FileUploadItemStatus.displayName = 'FileUpload.ItemStatus'

export type FileUploadItemRetryProps = Omit<
  ButtonProps,
  'href' | 'external' | 'target' | 'rel' | 'download'
>

/**
 * Uploads a failed file again, without picking it again. It shows only once
 * the upload has failed, and focus moves to the row's Cancel, or the
 * Dropzone or Trigger in a row without one.
 */
export function FileUploadItemRetry({
  onClick,
  children,
  ...props
}: FileUploadItemRetryProps) {
  const { retry, disabled, triggerRef } = useFileUploadContext(
    'FileUpload.ItemRetry'
  )
  const { item } = useFileUploadItem('FileUpload.ItemRetry')
  if (item.status !== 'error') return null
  return (
    <Button
      data-slot='file-upload-item-retry'
      size='sm'
      emphasis='subtle'
      aria-label={`Retry ${item.file.name}`}
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        const remove = event.currentTarget
          .closest('[data-slot=file-upload-item]')
          ?.querySelector<HTMLElement>('[data-slot=file-upload-item-remove]')
        retry(item.file)
        ;(remove ?? triggerRef.current)?.focus({ preventScroll: true })
      }}
      {...props}
    >
      {children ?? (
        <>
          <ArrowClockwiseIcon weight='bold' className='size-4' />
          Retry
        </>
      )}
    </Button>
  )
}

FileUploadItemRetry.displayName = 'FileUpload.ItemRetry'

export type FileUploadItemRemoveProps = Omit<IconButtonProps, 'aria-label'> & {
  'aria-label'?: string
}

/**
 * Takes the file out of the value, and reads Cancel while it waits or
 * uploads, which aborts the upload. Focus moves to the next row's Remove, the
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
      aria-label={`${item.status === 'queued' || item.status === 'uploading' ? 'Cancel' : 'Remove'} ${item.file.name}`}
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
