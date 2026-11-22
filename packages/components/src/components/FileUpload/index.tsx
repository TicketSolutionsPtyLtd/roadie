// No 'use client': dot access must work from server components.
import { FileUploadClear } from './FileUploadClear'
import { FileUploadControl } from './FileUploadControl'
import { FileUploadDropzone } from './FileUploadDropzone'
import { FileUploadRoot } from './FileUploadRoot'
import { FileUploadTrigger } from './FileUploadTrigger'
import { FileUploadValue } from './FileUploadValue'

const FileUpload = FileUploadRoot as typeof FileUploadRoot & {
  Root: typeof FileUploadRoot
  Dropzone: typeof FileUploadDropzone
  Control: typeof FileUploadControl
  Value: typeof FileUploadValue
  Clear: typeof FileUploadClear
  Trigger: typeof FileUploadTrigger
}

FileUpload.Root = FileUploadRoot
FileUpload.Dropzone = FileUploadDropzone
FileUpload.Control = FileUploadControl
FileUpload.Value = FileUploadValue
FileUpload.Clear = FileUploadClear
FileUpload.Trigger = FileUploadTrigger

export { FileUpload }
export type { FileUploadRootProps as FileUploadProps } from './FileUploadRoot'
export type { FileUploadDropzoneProps } from './FileUploadDropzone'
export type { FileUploadControlProps } from './FileUploadControl'
export type { FileUploadValueProps } from './FileUploadValue'
export type { FileUploadClearProps } from './FileUploadClear'
export type { FileUploadTriggerProps } from './FileUploadTrigger'
export type { FileUploadRejection, FileUploadRejectionCode } from './checkFile'
