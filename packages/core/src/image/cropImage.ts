import type { ImageCropValue } from './crop'

export interface CropImageOptions {
  /** The output's width in pixels. Defaults to the crop's own width. */
  width?: number
  /** The output's type. Defaults to the source's type, or PNG. */
  type?: string
  /** From 0 to 1, for lossy types such as JPEG and WebP. */
  quality?: number
}

/**
 * Draws the crop of an image that `value` describes, turned by its
 * rotation, and encodes it. Runs on an `OffscreenCanvas` where there is one.
 * A URL must allow cross-origin reads, or the canvas can't be encoded.
 */
export async function cropImage(
  source: string | Blob,
  { area, rotation }: ImageCropValue,
  { width = Math.round(area.width), type, quality }: CropImageOptions = {}
): Promise<Blob> {
  const blob =
    typeof source === 'string' ? await (await fetch(source)).blob() : source
  const bitmap = await createImageBitmap(blob)
  const height = Math.round((width * area.height) / area.width)
  const scale = width / area.width
  const angle = (rotation * Math.PI) / 180
  const cos = Math.abs(Math.cos(angle))
  const sin = Math.abs(Math.sin(angle))
  // The turned image's bounding box, which `area` is measured in.
  const boxWidth = bitmap.width * cos + bitmap.height * sin
  const boxHeight = bitmap.width * sin + bitmap.height * cos

  const canvas =
    typeof OffscreenCanvas === 'undefined'
      ? Object.assign(document.createElement('canvas'), { width, height })
      : new OffscreenCanvas(width, height)
  const context = canvas.getContext('2d') as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
  context.imageSmoothingQuality = 'high'
  context.scale(scale, scale)
  context.translate(boxWidth / 2 - area.x, boxHeight / 2 - area.y)
  context.rotate(angle)
  context.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2)
  bitmap.close()

  const options = { type: type ?? (blob.type || 'image/png'), quality }
  if ('convertToBlob' in canvas) return canvas.convertToBlob(options)
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (made) =>
        made
          ? resolve(made)
          : reject(new Error('The crop could not be encoded.')),
      options.type,
      quality
    )
  )
}
