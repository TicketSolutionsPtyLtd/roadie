'use client'

import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { Separator } from '../Separator'
import { useImageCropContext } from './ImageCropContext'
import { ImageCropReset } from './ImageCropReset'
import { ImageCropRotate } from './ImageCropRotate'
import { ImageCropZoom } from './ImageCropZoom'

export type ImageCropControlsProps = ComponentProps<'div'>

/**
 * A floating pill over the bottom edge of the Stage. With no children it
 * holds `Zoom`, `Rotate` and `Reset`.
 */
export function ImageCropControls({
  className,
  children,
  ...props
}: ImageCropControlsProps) {
  useImageCropContext('ImageCrop.Controls')
  return (
    <div
      role='group'
      aria-label='Crop controls'
      data-slot='image-crop-controls'
      className={cn(
        // Pulled up over the Stage's bottom edge, which a gap can't do.
        'relative z-1 -mt-8.5 flex w-fit max-w-full items-center gap-1 justify-self-center rounded-full border p-1 emphasis-floating is-translucent',
        className
      )}
      {...props}
    >
      {children ?? (
        <>
          <ImageCropZoom />
          <Separator orientation='vertical' className='my-1.5' />
          <ImageCropRotate />
          <ImageCropReset />
        </>
      )}
    </div>
  )
}
