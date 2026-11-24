'use client'

import { type ComponentProps, useEffect, useRef, useState } from 'react'

import {
  FileCsvIcon,
  FileImageIcon,
  FilePdfIcon,
  FileTextIcon
} from '@phosphor-icons/react'

import { cn } from '@oztix/roadie-core/utils'

import { mergeRefs } from '../../utils/mergeRefs'
import { useFileUploadItem } from './FileUploadContext'

export type FileUploadItemPreviewProps = ComponentProps<'div'> & {
  /** The image's alternative text. Empty by default, since the name sits beside it. */
  alt?: string
}

function fileIcon({ type, name }: File) {
  const Icon = type.startsWith('image/')
    ? FileImageIcon
    : type === 'application/pdf'
      ? FilePdfIcon
      : type === 'text/csv' || /\.csv$/i.test(name)
        ? FileCsvIcon
        : FileTextIcon
  return <Icon weight='bold' className='size-6' />
}

/**
 * An object URL for the file, scaled down where it can be so its short side
 * still covers a `width` by `height` box in device pixels.
 */
async function previewUrl(file: File, width: number, height: number) {
  // jsdom has no layout, so a zero box skips the bitmap.
  if (width && height) {
    try {
      const bitmap = await createImageBitmap(file)
      const scale = Math.min(
        1,
        Math.max(width / bitmap.width, height / bitmap.height)
      )
      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(bitmap.width * scale)
      canvas.height = Math.ceil(bitmap.height * scale)
      const context = canvas.getContext('2d')!
      context.imageSmoothingQuality = 'high'
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      bitmap.close()
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/webp', 0.9)
      )
      if (blob) return URL.createObjectURL(blob)
    } catch {
      // No createImageBitmap, or a format it can't read, such as SVG in some browsers.
    }
  }
  return URL.createObjectURL(file)
}

/**
 * A thumbnail of an image file, drawn at the tile's size off the main thread
 * and shown once it has decoded, so it never paints half loaded. Any other
 * file gets an icon for its type. Its object URL is revoked when the row goes.
 */
export function FileUploadItemPreview({
  ref,
  alt = '',
  className,
  ...props
}: FileUploadItemPreviewProps) {
  const { file } = useFileUploadItem('FileUpload.ItemPreview').item
  const tileRef = useRef<HTMLDivElement>(null)
  const [src, setSrc] = useState<string>()
  const image = file.type.startsWith('image/')

  useEffect(() => {
    if (!image) return
    let live = true
    let url: string | undefined
    const tile = tileRef.current
    const [width, height] = [tile?.clientWidth, tile?.clientHeight].map(
      (size) => Math.ceil((size ?? 0) * devicePixelRatio)
    ) as [number, number]
    previewUrl(file, width, height)
      .then(async (made) => {
        url = made
        if (!live) return URL.revokeObjectURL(made)
        const decoder = new Image()
        decoder.src = made
        await decoder.decode()
        if (live) setSrc(made)
      })
      // A file the browser can't decode, such as a HEIC, keeps the icon.
      // That's the intended fallback, not an error to report.
      .catch(() => {})
    return () => {
      live = false
      setSrc(undefined)
      if (url) URL.revokeObjectURL(url)
    }
  }, [file, image])

  return (
    <div
      ref={mergeRefs(ref, tileRef)}
      data-slot='file-upload-item-preview'
      className={cn(
        'relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg emphasis-subtle text-subtle',
        className
      )}
      {...props}
    >
      {src ? (
        // Out of flow: drawn in device pixels, its own size would stretch the tile.
        <img
          src={src}
          alt={alt}
          className='absolute inset-0 size-full object-cover'
        />
      ) : (
        // An image shows its icon only while it decodes, or when it can't.
        fileIcon(file)
      )}
    </div>
  )
}

FileUploadItemPreview.displayName = 'FileUpload.ItemPreview'
