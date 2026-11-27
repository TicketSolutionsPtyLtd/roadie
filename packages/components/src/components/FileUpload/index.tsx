// No 'use client': dot access must work from server components.
import { FileUploadClear } from './FileUploadClear'
import { FileUploadControl } from './FileUploadControl'
import { FileUploadDropzone } from './FileUploadDropzone'
import {
  FileUploadItem,
  FileUploadItemName,
  FileUploadItemRemove,
  FileUploadItemRetry,
  FileUploadItemSize,
  FileUploadItemStatus
} from './FileUploadItem'
import { FileUploadItemPreview } from './FileUploadItemPreview'
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
  ItemPreview: typeof FileUploadItemPreview
  ItemName: typeof FileUploadItemName
  ItemSize: typeof FileUploadItemSize
  ItemStatus: typeof FileUploadItemStatus
  ItemRemove: typeof FileUploadItemRemove
  ItemRetry: typeof FileUploadItemRetry
  Clear: typeof FileUploadClear
  Trigger: typeof FileUploadTrigger
}

FileUpload.Root = FileUploadRoot
FileUpload.Dropzone = FileUploadDropzone
FileUpload.Control = FileUploadControl
FileUpload.Value = FileUploadValue
FileUpload.List = FileUploadList
FileUpload.Item = FileUploadItem
FileUpload.ItemPreview = FileUploadItemPreview
FileUpload.ItemName = FileUploadItemName
FileUpload.ItemSize = FileUploadItemSize
FileUpload.ItemStatus = FileUploadItemStatus
FileUpload.ItemRemove = FileUploadItemRemove
FileUpload.ItemRetry = FileUploadItemRetry
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
  FileUploadItemStatusProps,
  FileUploadItemRemoveProps,
  FileUploadItemRetryProps
} from './FileUploadItem'
export type { FileUploadItemPreviewProps } from './FileUploadItemPreview'
export type { FileUploadItem, FileUploadStatus } from './FileUploadContext'
export type { FileUploadClearProps } from './FileUploadClear'
export type { FileUploadTriggerProps } from './FileUploadTrigger'
export type { FileUploadRejection, FileUploadRejectionCode } from './checkFile'
