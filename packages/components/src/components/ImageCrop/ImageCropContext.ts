'use client'

import { createContext, use } from 'react'

import type { CropSize, ImageCropValue } from '@oztix/roadie-core/image'

export type ImageCropShape = 'rectangle' | 'circle'

export type ImageCropContextValue = {
  /** The image URL, once a Blob has one. */
  src?: string
  aspectRatio: number
  shape: ImageCropShape
  min?: CropSize
  label: string
  value?: ImageCropValue
  commit: (value: ImageCropValue) => void
}

export const ImageCropContext = createContext<ImageCropContextValue | null>(
  null
)

export function useImageCropContext(part: string) {
  const context = use(ImageCropContext)
  if (!context) throw new Error(`${part} must be inside ImageCrop.`)
  return context
}
