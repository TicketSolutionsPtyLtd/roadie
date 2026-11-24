// No 'use client': dot access must work from server components.
import { ImageCropControls } from './ImageCropControls'
import { ImageCropReset } from './ImageCropReset'
import { ImageCropRoot } from './ImageCropRoot'
import { ImageCropRotate } from './ImageCropRotate'
import { ImageCropStage } from './ImageCropStage'
import { ImageCropZoom } from './ImageCropZoom'

const ImageCrop = ImageCropRoot as typeof ImageCropRoot & {
  Root: typeof ImageCropRoot
  Stage: typeof ImageCropStage
  Controls: typeof ImageCropControls
  Zoom: typeof ImageCropZoom
  Rotate: typeof ImageCropRotate
  Reset: typeof ImageCropReset
}

ImageCrop.Root = ImageCropRoot
ImageCrop.Stage = ImageCropStage
ImageCrop.Controls = ImageCropControls
ImageCrop.Zoom = ImageCropZoom
ImageCrop.Rotate = ImageCropRotate
ImageCrop.Reset = ImageCropReset

export { ImageCrop }
export type { ImageCropRootProps as ImageCropProps } from './ImageCropRoot'
export type { ImageCropStageProps } from './ImageCropStage'
export type { ImageCropControlsProps } from './ImageCropControls'
export type { ImageCropZoomProps } from './ImageCropZoom'
export type { ImageCropRotateProps } from './ImageCropRotate'
export type { ImageCropResetProps } from './ImageCropReset'
export type { ImageCropShape } from './ImageCropContext'
export type { ImageCropValue } from '@oztix/roadie-core/image'
