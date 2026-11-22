'use client'

import { type ComponentProps, useEffect, useState } from 'react'

import type { ImageCropValue } from '@oztix/roadie-core/image'
import { cn } from '@oztix/roadie-core/utils'

import { ImageCropContext, type ImageCropShape } from './ImageCropContext'
import { ImageCropStage } from './ImageCropStage'
import { minCrop } from './cropState'

export type ImageCropRootProps = Omit<
  ComponentProps<'div'>,
  'defaultValue' | 'onChange'
> & {
  /** The image: a URL, or a File or Blob such as one from `FileUpload`. */
  src: string | Blob
  /** The frame's width over its height, so `2` for a 2:1 event image. */
  aspectRatio: number
  /** The frame's mask. The value is always a rectangle. */
  shape?: ImageCropShape
  /** The narrowest crop in the image's own pixels. Zoom stops before the crop drops below it. */
  minWidth?: number
  /** The shortest crop in the image's own pixels. Zoom stops before the crop drops below it. */
  minHeight?: number
  /** The crop, when you control it. Its `area` (or `percent`) wins over `zoom`. */
  value?: ImageCropValue
  /** The crop to start with, when ImageCrop controls it. */
  defaultValue?: ImageCropValue
  /**
   * Called once the image loads, with the centred crop that covers the frame,
   * then once each time a drag, a burst of wheel zoom or a key press ends.
   */
  onValueChange?: (value: ImageCropValue) => void
  /** What a screen reader calls the crop area. */
  label?: string
}

function useSourceUrl(src: string | Blob) {
  const [blob, setBlob] = useState<{ src: Blob; url: string }>()
  useEffect(() => {
    if (typeof src === 'string') return
    const url = URL.createObjectURL(src)
    // oxlint-disable-next-line react/set-state-in-effect -- an object URL is an external resource, made and revoked here
    setBlob({ src, url })
    return () => URL.revokeObjectURL(url)
  }, [src])
  if (typeof src === 'string') return src
  return blob?.src === src ? blob.url : undefined
}

/**
 * Crops an image to a fixed ratio: the image pans and zooms under a frame.
 * With no children it renders `ImageCrop.Stage`.
 */
export function ImageCropRoot({
  src,
  aspectRatio,
  shape = 'rectangle',
  minWidth,
  minHeight,
  value,
  defaultValue,
  onValueChange,
  label = 'Crop image',
  className,
  children,
  ...props
}: ImageCropRootProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue)
  const [last, setLast] = useState<{ src?: string; value: ImageCropValue }>()
  const url = useSourceUrl(src)
  const commit = (next: ImageCropValue) => {
    if (value === undefined) setUncontrolled(next)
    setLast({ src: url, value: next })
    onValueChange?.(next)
  }
  // A crop made for the last image, echoed back, doesn't carry to a new one.
  const given = value ?? uncontrolled
  const current =
    last && last.value === given && last.src !== url ? undefined : given

  return (
    <ImageCropContext
      value={{
        src: url,
        aspectRatio,
        shape,
        min: minCrop(aspectRatio, minWidth, minHeight),
        label,
        value: current,
        commit
      }}
    >
      <div className={cn('grid gap-3', className)} {...props}>
        {children ?? <ImageCropStage />}
      </div>
    </ImageCropContext>
  )
}
