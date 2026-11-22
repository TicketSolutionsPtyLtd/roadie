// No 'use client': dot access must work from server components.
import { ImageCropRoot } from './ImageCropRoot'
import { ImageCropStage } from './ImageCropStage'

const ImageCrop = ImageCropRoot as typeof ImageCropRoot & {
  Root: typeof ImageCropRoot
  Stage: typeof ImageCropStage
}

ImageCrop.Root = ImageCropRoot
ImageCrop.Stage = ImageCropStage

export { ImageCrop }
export type { ImageCropRootProps as ImageCropProps } from './ImageCropRoot'
export type { ImageCropStageProps } from './ImageCropStage'
export type { ImageCropShape } from './ImageCropContext'
export type { ImageCropValue } from '@oztix/roadie-core/image'
