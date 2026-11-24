'use client'

import { createContext, use } from 'react'

import type { CropSize, ImageCropValue } from '@oztix/roadie-core/image'

import type { CropScene } from './cropState'

export type ImageCropShape = 'rectangle' | 'circle'

export type CommitOptions = {
  /** Springs the image to the value, as a button press or a release does. */
  animate?: boolean
  /** Leaves the live region quiet, as the report on load does. */
  quiet?: boolean
}

export type ImageCropContextValue = {
  /** The image URL, once a Blob has one. */
  src?: string
  /** The frame's ratio, or none for free-form. */
  aspectRatio?: number
  shape: ImageCropShape
  min?: CropSize
  label: string
  /** The frame and image, once the Stage has measured them. */
  scene?: CropScene
  setScene: (scene?: CropScene) => void
  /** The crop on screen, fitted to the scene. */
  shown?: ImageCropValue
  /** The given value, or none for the centred default. */
  value?: ImageCropValue
  commit: (value: ImageCropValue, options?: CommitOptions) => void
  /** Bumped by each animated commit, so the Stage springs to it. */
  springs: number
  /** Shows a value mid-gesture, or goes back to `shown` with `null`. */
  preview: (value: ImageCropValue | null) => void
  /** Where the Stage hands `preview` its painter while it's mounted. */
  setPainter: (painter: ((value: ImageCropValue | null) => void) | null) => void
  /** Replays the size chip's nudge, for a zoom past the minimum crop. */
  nudge: () => void
  nudges: number
}

export const ImageCropContext = createContext<ImageCropContextValue | null>(
  null
)

export function useImageCropContext(part: string) {
  const context = use(ImageCropContext)
  if (!context) throw new Error(`${part} must be inside ImageCrop.`)
  return context
}
