// Subpath entry for `@oztix/roadie-components/file-upload`.
//
// No `'use client'`: server-safe property-assignment layer.
// See docs/contributing/COMPOUND_PATTERNS.md.
import { FileUploadRoot } from './FileUploadRoot'
import { FileUploadTrigger } from './FileUploadTrigger'

const FileUpload = FileUploadRoot as typeof FileUploadRoot & {
  Root: typeof FileUploadRoot
  Trigger: typeof FileUploadTrigger
}

FileUpload.Root = FileUploadRoot
FileUpload.Trigger = FileUploadTrigger

export { FileUpload }
export type { FileUploadRootProps as FileUploadProps } from './FileUploadRoot'
export type { FileUploadTriggerProps } from './FileUploadTrigger'
export type { FileUploadRejection, FileUploadRejectionCode } from './checkFile'
