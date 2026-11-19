export interface CropSize {
  width: number
  height: number
}

const toRadians = (degrees: number) => (degrees * Math.PI) / 180

// Rounds away float noise so quarter turns give whole pixels (cos 90° is 6e-17).
const snap = (n: number) => Math.round(n * 1e12) / 1e12

function turn(rotation: number) {
  const angle = toRadians(rotation)
  return { cos: snap(Math.cos(angle)), sin: snap(Math.sin(angle)) }
}

function spread(rotation: number) {
  const { cos, sin } = turn(rotation)
  return { cos: Math.abs(cos), sin: Math.abs(sin) }
}

/**
 * The smallest zoom (screen px per natural px) at which `image`, turned by
 * `rotation` degrees, still covers `frame` with no empty corners.
 */
export function coverZoom(
  frame: CropSize,
  image: CropSize,
  rotation = 0
): number {
  const { cos, sin } = spread(rotation)
  return Math.max(
    (frame.width * cos + frame.height * sin) / image.width,
    (frame.width * sin + frame.height * cos) / image.height
  )
}

export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * A crop of an image. `area` is in the image's natural pixels and `percent`
 * runs 0 to 100, both measured from the top left of the image's bounding
 * box once it's turned by `rotation`.
 */
export interface ImageCropValue {
  area: CropRect
  percent: CropRect
  /** Screen pixels per natural pixel. */
  zoom: number
  /** Degrees clockwise: 90° steps plus a straighten of up to ±45°. */
  rotation: number
}

function boundingBox(image: CropSize, rotation: number): CropSize {
  const { cos, sin } = spread(rotation)
  return {
    width: image.width * cos + image.height * sin,
    height: image.width * sin + image.height * cos
  }
}

function scaleRect(rect: CropRect, x: number, y: number): CropRect {
  return {
    x: rect.x * x,
    y: rect.y * y,
    width: rect.width * x,
    height: rect.height * y
  }
}

/**
 * The full crop value for an `area` in natural pixels or a `percent` of the
 * turned image, with the zoom that fits it to `frame`.
 */
export function cropValueAt(
  crop: { area: CropRect } | { percent: CropRect },
  frame: CropSize,
  image: CropSize,
  rotation = 0
): ImageCropValue {
  const box = boundingBox(image, rotation)
  const area =
    'area' in crop
      ? crop.area
      : scaleRect(crop.percent, box.width / 100, box.height / 100)
  return {
    area,
    percent: scaleRect(area, 100 / box.width, 100 / box.height),
    zoom: Math.min(frame.width / area.width, frame.height / area.height),
    rotation
  }
}

export interface ClampCropOptions {
  /** The smallest crop in natural pixels, which caps how far it zooms in. */
  min?: CropSize
}

const clamp = (n: number, limit: number) => Math.min(Math.max(n, -limit), limit)

/**
 * Keeps a crop valid: zoomed in far enough to cover `frame`, no further than
 * `min` allows (cover wins when the image is smaller than `min`), and moved
 * so `frame` stays inside the turned image. The area is resized to `zoom`
 * about its centre.
 */
export function clampCrop(
  value: ImageCropValue,
  frame: CropSize,
  image: CropSize,
  { min }: ClampCropOptions = {}
): ImageCropValue {
  const { rotation } = value
  const cover = coverZoom(frame, image, rotation)
  const cap = min
    ? Math.min(frame.width / min.width, frame.height / min.height)
    : Infinity
  const zoom = Math.max(cover, Math.min(value.zoom, cap))
  const width = frame.width / zoom
  const height = frame.height / zoom

  const box = boundingBox(image, rotation)
  const dx = value.area.x + value.area.width / 2 - box.width / 2
  const dy = value.area.y + value.area.height / 2 - box.height / 2

  // Clamp the centre along the image's own axes, where its edges are straight.
  const { cos, sin } = turn(rotation)
  const { cos: c, sin: s } = spread(rotation)
  const reachX = image.width / 2 - (width * c + height * s) / 2
  const reachY = image.height / 2 - (width * s + height * c) / 2
  const localX = clamp(dx * cos + dy * sin, reachX)
  const localY = clamp(-dx * sin + dy * cos, reachY)
  const centreX = box.width / 2 + localX * cos - localY * sin
  const centreY = box.height / 2 + localX * sin + localY * cos

  return cropValueAt(
    {
      area: {
        x: centreX - width / 2,
        y: centreY - height / 2,
        width,
        height
      }
    },
    frame,
    image,
    rotation
  )
}

// The resistance iOS scroll views use at their edges.
const RUBBER_BAND = 0.55

/**
 * Lets `offset` move freely within ±`limit` and resists it beyond, easing
 * towards `dimension` past the limit without reaching it, so a drag past an
 * edge stretches and can spring back.
 */
export function rubberBand(
  offset: number,
  limit: number,
  dimension: number
): number {
  const overshoot = Math.abs(offset) - limit
  if (overshoot <= 0) return offset
  const stretch =
    (1 - 1 / ((overshoot * RUBBER_BAND) / dimension + 1)) * dimension
  return Math.sign(offset) * (limit + stretch)
}
