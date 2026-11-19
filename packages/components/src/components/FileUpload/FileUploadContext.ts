'use client'

import { type Ref, createContext, use } from 'react'

export type FileUploadContextValue = {
  open: () => void
  triggerRef: Ref<HTMLElement>
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
