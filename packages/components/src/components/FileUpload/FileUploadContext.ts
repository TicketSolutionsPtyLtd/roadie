'use client'

import { type RefObject, createContext, use } from 'react'

export type FileUploadContextValue = {
  files: File[]
  /** Checks picked, dropped or pasted files and takes the ones that pass. */
  take: (files: ArrayLike<File>) => void
  open: () => void
  clear: () => void
  remove: (file: File) => void
  /** Sets the files in a new order. */
  reorder: (files: File[]) => void
  maxFiles: number
  /** Each file's upload, once `onUpload` has queued it. */
  uploads: ReadonlyMap<File, FileUploadUpload>
  /** Queues a failed upload again. */
  retry: (file: File) => void
  inputId: string
  valueId: string
  triggerRef: RefObject<HTMLElement | null>
  disabled: boolean
  invalid: boolean
  labelId?: string
  describedBy?: string
}

export const FileUploadContext = createContext<FileUploadContextValue | null>(
  null
)

export function useFileUploadContext(part: string) {
  const context = use(FileUploadContext)
  if (!context) throw new Error(`${part} must be inside FileUpload.`)
  return context
}

/** Where a file's upload is. `idle` means `onUpload` isn't uploading it. */
export type FileUploadStatus =
  | 'idle'
  | 'queued'
  | 'uploading'
  | 'done'
  | 'error'

export type FileUploadUpload = {
  status: FileUploadStatus
  /** From 0 to 1, as `onUpload` reports it. */
  progress: number
  /** What `onUpload` resolved, once it's done. */
  result?: unknown
  /** What `onUpload` rejected with, once it has failed. */
  error?: unknown
}

/**
 * A file in `FileUpload.List`, with an id that stays the same while it's
 * there, and its upload.
 */
export type FileUploadItem = FileUploadUpload & { file: File; id: string }

export const FileUploadItemContext = createContext<{
  item: FileUploadItem
  /** Removed, and collapsing before it goes. */
  leaving: boolean
  /** Its place among the files added with it, for the stagger. */
  enterIndex: number
  onLeft: () => void
  /** Called by `FileUpload.Item`, which runs the collapse and calls `onLeft`. */
  claim: (id: string) => void
} | null>(null)

export function useFileUploadItem(part: string) {
  const context = use(FileUploadItemContext)
  if (!context) throw new Error(`${part} must be inside FileUpload.List.`)
  return context
}

/**
 * Set inside `FileUpload.Control`: a Trigger there joins the bar's end as a
 * segment, and Value says when files are over the bar.
 */
export const FileUploadInControl = createContext<{ dragging: boolean } | null>(
  null
)
