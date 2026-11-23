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
  /**
   * The crop, when you control it. Its `area` (or `percent`) wins over `zoom`.
   * A new `src` starts centred unless a new value comes with it.
   */
  value?: ImageCropValue
  /** The crop to start with, when ImageCrop controls it. */
  defaultValue?: ImageCropValue
  /**
   * Called once the image loads, with the centred crop that covers the frame
   * (or the given value, moved to fit, if it didn't), then once each time a
   * drag, a burst of wheel zoom or a key press ends.
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

function sameValue(a?: ImageCropValue, b?: ImageCropValue) {
  if (!a || !b) return a === b
  return (
    a.rotation === b.rotation &&
    (['x', 'y', 'width', 'height'] as const).every(
      (key) => a.area[key] === b.area[key]
    )
  )
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
  const url = useSourceUrl(src)
  const commit = (next: ImageCropValue) => {
    if (value === undefined) setUncontrolled(next)
    onValueChange?.(next)
  }
  // A value that hasn't changed since `src` did was made for the last image,
  // so a new one starts centred. A value given with the new `src` is kept.
  const given = value ?? uncontrolled
  const [seen, setSeen] = useState<{
    src: string | Blob
    given?: ImageCropValue
    stale?: ImageCropValue
  }>({ src, given })
  // Compared by content, since a parent may pass a fresh copy each render.
  const changed = !sameValue(seen.given, given)
  const stale = changed ? undefined : seen.src !== src ? given : seen.stale
  if (seen.src !== src || changed) setSeen({ src, given, stale })
  const current = stale && sameValue(given, stale) ? undefined : given

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
