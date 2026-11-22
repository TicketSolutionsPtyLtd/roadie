import {
  type CropSize,
  type ImageCropValue,
  clampCrop,
  coverZoom,
  cropValueAt
} from '@oztix/roadie-core/image'

/** How far past covering the frame the image can zoom when no minimum caps it. */
export const MAX_ZOOM_OVER_COVER = 8

export interface CropScene {
  /** The frame on screen, in px. */
  frame: CropSize
  /** The image's natural size. */
  image: CropSize
  /** The smallest crop in natural px. */
  min?: CropSize
}

/** The minimum crop at `aspectRatio`, from whichever of the two sides is set. */
export function minCrop(
  aspectRatio: number,
  minWidth?: number,
  minHeight?: number
): CropSize | undefined {
  if (!minWidth && !minHeight) return undefined
  const width = Math.max(minWidth ?? 0, (minHeight ?? 0) * aspectRatio)
  return { width, height: width / aspectRatio }
}

/** The largest frame at `aspectRatio` inside `stage`, less `inset` on each side. */
export function fitFrame(
  stage: CropSize,
  aspectRatio: number,
  inset: number
): CropSize {
  const width = Math.max(stage.width - inset * 2, 0)
  const height = Math.max(stage.height - inset * 2, 0)
  return width / height > aspectRatio
    ? { width: height * aspectRatio, height }
    : { width, height: width / aspectRatio }
}

function clampTo(value: ImageCropValue, scene: CropScene) {
  const max =
    coverZoom(scene.frame, scene.image, value.rotation) * MAX_ZOOM_OVER_COVER
  return clampCrop(
    { ...value, zoom: Math.min(value.zoom, max) },
    scene.frame,
    scene.image,
    { min: scene.min }
  )
}

/**
 * Fits a value to the scene, or makes the centred default with none. The area
 * wins over `zoom`, which is in screen px and goes stale when the stage
 * resizes.
 */
export function fitCrop(
  value: ImageCropValue | undefined,
  scene: CropScene
): ImageCropValue {
  const rotation = value?.rotation ?? 0
  const crop = value
    ? { area: value.area }
    : { percent: { x: 0, y: 0, width: 100, height: 100 } }
  return clampTo(cropValueAt(crop, scene.frame, scene.image, rotation), scene)
}

/** Moves the area by `dx`, `dy` natural px and keeps it inside the image. */
export function panBy(
  value: ImageCropValue,
  dx: number,
  dy: number,
  scene: CropScene
): ImageCropValue {
  const area = { ...value.area, x: value.area.x + dx, y: value.area.y + dy }
  return clampTo({ ...value, area }, scene)
}

/**
 * Zooms to `zoom`, within cover and the cap. An `anchor` (screen px from the
 * frame's centre) keeps the point under it still, as a cursor does.
 */
export function zoomTo(
  value: ImageCropValue,
  zoom: number,
  scene: CropScene,
  anchor?: { x: number; y: number }
): ImageCropValue {
  const sized = clampTo({ ...value, zoom }, scene)
  if (!anchor) return sized
  return panBy(
    sized,
    anchor.x / value.zoom - anchor.x / sized.zoom,
    anchor.y / value.zoom - anchor.y / sized.zoom,
    scene
  )
}

/** The image's CSS transform, with the image centred on the frame before it. */
export function transformOf(value: ImageCropValue, image: CropSize): string {
  const { area, zoom, rotation } = value
  const turn = (rotation * Math.PI) / 180
  const box = {
    width:
      Math.abs(image.width * Math.cos(turn)) +
      Math.abs(image.height * Math.sin(turn)),
    height:
      Math.abs(image.width * Math.sin(turn)) +
      Math.abs(image.height * Math.cos(turn))
  }
  const x = (box.width / 2 - area.x - area.width / 2) * zoom
  const y = (box.height / 2 - area.y - area.height / 2) * zoom
  return `translate3d(${x}px, ${y}px, 0) rotate(${rotation}deg) scale(${zoom})`
}

/** Whether two values crop the same pixels, to half a natural px. */
export function sameCrop(a: ImageCropValue, b: ImageCropValue): boolean {
  return (
    a.rotation === b.rotation &&
    (['x', 'y', 'width', 'height'] as const).every(
      (key) => Math.abs(a.area[key] - b.area[key]) < 0.5
    )
  )
}
