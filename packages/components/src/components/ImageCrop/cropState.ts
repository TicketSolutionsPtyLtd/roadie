import {
  type CropSize,
  type ImageCropValue,
  clampCrop,
  coverZoom,
  cropValueAt,
  rubberBand
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

// Rounds away float noise so quarter turns give whole pixels (cos 90° is 6e-17).
function turnOf(degrees: number) {
  const angle = (degrees * Math.PI) / 180
  const snap = (n: number) => Math.round(n * 1e12) / 1e12
  return { cos: snap(Math.cos(angle)), sin: snap(Math.sin(angle)) }
}

function boxOf(image: CropSize, rotation: number): CropSize {
  const turn = turnOf(rotation)
  const cos = Math.abs(turn.cos)
  const sin = Math.abs(turn.sin)
  return {
    width: image.width * cos + image.height * sin,
    height: image.width * sin + image.height * cos
  }
}

const centreOf = ({ area }: ImageCropValue) => ({
  x: area.x + area.width / 2,
  y: area.y + area.height / 2
})

// The value at `zoom` centred on `centre`, unclamped.
function around(
  centre: { x: number; y: number },
  zoom: number,
  rotation: number,
  { frame, image }: CropScene
): ImageCropValue {
  const width = frame.width / zoom
  const height = frame.height / zoom
  const area = {
    x: centre.x - width / 2,
    y: centre.y - height / 2,
    width,
    height
  }
  return cropValueAt({ area }, frame, image, rotation)
}

/**
 * The zooms the slider runs between: `cover` fills the frame, and `max` stops
 * at the minimum crop. `short` says the image is smaller than the minimum.
 */
export function zoomRange(scene: CropScene, rotation: number) {
  const cover = coverZoom(scene.frame, scene.image, rotation)
  const cap = scene.min
    ? Math.min(
        scene.frame.width / scene.min.width,
        scene.frame.height / scene.min.height
      )
    : Infinity
  const max = Math.max(cover, Math.min(cap, cover * MAX_ZOOM_OVER_COVER))
  return { cover, max, short: cap < cover }
}

/**
 * Turns the image by `degrees` (negative is left) about the frame's centre,
 * keeping the spot under it. It zooms in if the turned image needs it, and
 * a crop that covered the frame exactly still does.
 */
export function rotateBy(
  value: ImageCropValue,
  degrees: number,
  scene: CropScene
): ImageCropValue {
  const rotation = (((value.rotation + degrees) % 360) + 360) % 360
  const from = boxOf(scene.image, value.rotation)
  const to = boxOf(scene.image, rotation)
  const { x, y } = centreOf(value)
  const dx = x - from.width / 2
  const dy = y - from.height / 2
  const { cos, sin } = turnOf(degrees)
  const fitted = value.zoom <= zoomRange(scene, value.rotation).cover * 1.001
  const zoom = fitted ? zoomRange(scene, rotation).cover : value.zoom
  const centre = {
    x: to.width / 2 + dx * cos - dy * sin,
    y: to.height / 2 + dx * sin + dy * cos
  }
  return fitCrop(around(centre, zoom, rotation, scene), scene)
}

/**
 * Follows a drag or pinch from `start`, unclamped: the image point under
 * `from` ends up under `to` (screen px from the frame's centre), zoomed by
 * `scale`. Clamp it with `fitCrop`, or show it with `stretchCrop`.
 */
export function moveTo(
  start: ImageCropValue,
  from: { x: number; y: number },
  to: { x: number; y: number },
  scale: number,
  scene: CropScene
): ImageCropValue {
  const zoom = start.zoom * scale
  const { x, y } = centreOf(start)
  const centre = {
    x: x + from.x / start.zoom - to.x / zoom,
    y: y + from.y / start.zoom - to.y / zoom
  }
  return around(centre, zoom, start.rotation, scene)
}

/**
 * Clamps a value from a gesture, and the value to show while the gesture
 * lasts: past an edge or a zoom limit it gives way less the further it goes,
 * so it can spring back to `clamped` on release.
 */
export function stretchCrop(
  raw: ImageCropValue,
  scene: CropScene,
  stage: CropSize
): { clamped: ImageCropValue; painted: ImageCropValue } {
  const clamped = fitCrop(raw, scene)
  const over = raw.zoom - clamped.zoom
  const zoom =
    over === 0
      ? raw.zoom
      : clamped.zoom +
        Math.sign(over) *
          rubberBand(Math.abs(over), 0, clamped.zoom * (over > 0 ? 0.25 : 0.5))
  const from = centreOf(clamped)
  const to = centreOf(raw)
  const pull = (axis: 'x' | 'y', size: number) =>
    from[axis] + rubberBand((to[axis] - from[axis]) * zoom, 0, size) / zoom
  const centre = { x: pull('x', stage.width), y: pull('y', stage.height) }
  const painted = around(centre, zoom, raw.rotation, scene)
  return { clamped, painted: sameCrop(painted, clamped) ? clamped : painted }
}

/**
 * The image's CSS transform, with the image centred on the frame before it.
 * `turn` paints the rotation as an equal angle, so a spring can take the
 * short way round.
 */
export function transformOf(
  value: ImageCropValue,
  image: CropSize,
  turn = value.rotation
): string {
  const { area, zoom } = value
  const box = boxOf(image, value.rotation)
  const x = (box.width / 2 - area.x - area.width / 2) * zoom
  const y = (box.height / 2 - area.y - area.height / 2) * zoom
  return `translate3d(${x}px, ${y}px, 0) rotate(${turn}deg) scale(${zoom})`
}

/**
 * Whether two values look the same on screen, to half a px. It compares at
 * the larger zoom, since a given value's zoom can be stale or unset.
 */
export function sameCrop(a: ImageCropValue, b: ImageCropValue): boolean {
  const zoom = Math.max(a.zoom, b.zoom)
  return (
    a.rotation === b.rotation &&
    (['x', 'y', 'width', 'height'] as const).every(
      (key) => Math.abs(a.area[key] - b.area[key]) * zoom < 0.5
    )
  )
}
