// No 'use client': dot access must work from server components.
import { FileUploadClear } from './FileUploadClear'
import { FileUploadControl } from './FileUploadControl'
import { FileUploadDropzone } from './FileUploadDropzone'
import {
  FileUploadItem,
  FileUploadItemName,
  FileUploadItemRemove,
  FileUploadItemSize
} from './FileUploadItem'
import { FileUploadList } from './FileUploadList'
import { FileUploadRoot } from './FileUploadRoot'
import { FileUploadTrigger } from './FileUploadTrigger'
import { FileUploadValue } from './FileUploadValue'

const FileUpload = FileUploadRoot as typeof FileUploadRoot & {
  Root: typeof FileUploadRoot
  Dropzone: typeof FileUploadDropzone
  Control: typeof FileUploadControl
  Value: typeof FileUploadValue
  List: typeof FileUploadList
  Item: typeof FileUploadItem
  ItemName: typeof FileUploadItemName
  ItemSize: typeof FileUploadItemSize
  ItemRemove: typeof FileUploadItemRemove
  Clear: typeof FileUploadClear
  Trigger: typeof FileUploadTrigger
}

FileUpload.Root = FileUploadRoot
FileUpload.Dropzone = FileUploadDropzone
FileUpload.Control = FileUploadControl
FileUpload.Value = FileUploadValue
FileUpload.List = FileUploadList
FileUpload.Item = FileUploadItem
FileUpload.ItemName = FileUploadItemName
FileUpload.ItemSize = FileUploadItemSize
FileUpload.ItemRemove = FileUploadItemRemove
FileUpload.Clear = FileUploadClear
FileUpload.Trigger = FileUploadTrigger

export { FileUpload }
export type { FileUploadRootProps as FileUploadProps } from './FileUploadRoot'
export type { FileUploadDropzoneProps } from './FileUploadDropzone'
export type { FileUploadControlProps } from './FileUploadControl'
export type { FileUploadValueProps } from './FileUploadValue'
export type { FileUploadListProps } from './FileUploadList'
export type {
  FileUploadItemProps,
  FileUploadItemNameProps,
  FileUploadItemSizeProps,
  FileUploadItemRemoveProps
} from './FileUploadItem'
export type { FileUploadItem } from './FileUploadContext'
export type { FileUploadClearProps } from './FileUploadClear'
export type { FileUploadTriggerProps } from './FileUploadTrigger'
export type { FileUploadRejection, FileUploadRejectionCode } from './checkFile'
