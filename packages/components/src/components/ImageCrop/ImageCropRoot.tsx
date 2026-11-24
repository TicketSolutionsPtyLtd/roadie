'use client'

import {
  type ComponentProps,
  useEffect,
  useReducer,
  useRef,
  useState
} from 'react'

import type { ImageCropValue } from '@oztix/roadie-core/image'
import { cn } from '@oztix/roadie-core/utils'

import {
  type CommitOptions,
  ImageCropContext,
  type ImageCropShape
} from './ImageCropContext'
import { ImageCropControls } from './ImageCropControls'
import { ImageCropStage } from './ImageCropStage'
import { degreesText } from './ImageCropStraighten'
import {
  type CropScene,
  fitCrop,
  minCrop,
  straightenOf,
  zoomRange
} from './cropState'

// Long enough that a run of key presses is said once.
const ANNOUNCE_MS = 500

export type ImageCropRootProps = Omit<
  ComponentProps<'div'>,
  'defaultValue' | 'onChange'
> & {
  /** The image: a URL, or a File or Blob such as one from `FileUpload`. */
  src: string | Blob
  /**
   * The frame's width over its height, so `2` for a 2:1 event image. Leave it
   * out for free-form, where the frame's edges and corners resize it.
   */
  aspectRatio?: number
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

function sameScene(a?: CropScene, b?: CropScene) {
  if (!a || !b) return a === b
  return (
    a.frame.width === b.frame.width &&
    a.frame.height === b.frame.height &&
    a.image.width === b.image.width &&
    a.image.height === b.image.height &&
    a.min === b.min
  )
}

/** What the live region says once a crop settles. */
function describe(value: ImageCropValue, scene: CropScene, straighten: number) {
  const { width, height } = value.area
  const zoom = value.zoom / zoomRange(scene, value.rotation).cover
  const left = Math.round(360 - value.rotation + straighten) % 360
  return (
    `Crop ${Math.round(width)} by ${Math.round(height)} pixels, zoom ${Math.round(zoom * 100)} percent` +
    (left ? `, turned ${left} degrees left` : '') +
    (straighten ? `, straightened ${degreesText(straighten)}` : '') +
    '.'
  )
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
 * Crops an image to a fixed ratio, or free-form with no `aspectRatio`: the
 * image pans, zooms and turns under a frame. With no children it renders
 * `ImageCrop.Stage` and `ImageCrop.Controls`.
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
  const [scene, setSceneState] = useState<CropScene>()
  const setScene = (next?: CropScene) =>
    setSceneState((prev) => (sameScene(prev, next) ? prev : next))
  const [springs, spring] = useReducer((n: number) => n + 1, 0)
  const [nudges, nudge] = useReducer((n: number) => n + 1, 0)
  const painter = useRef<(value: ImageCropValue | null) => void>(null)
  const preview = (next: ImageCropValue | null) => painter.current?.(next)
  const setPainter = (next: typeof painter.current) => {
    painter.current = next
  }
  const [message, setMessage] = useState('')
  const announcing = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(announcing.current), [])
  const min = minCrop(aspectRatio, minWidth, minHeight)
  // ±45° is the same picture as the next quarter turn's ∓45°, so a tilt
  // there reads as the end the dial was last set to.
  const [end, setEnd] = useState(0)
  const straighten = (rotation: number, last = end) => {
    const angle = straightenOf(rotation)
    return Math.abs(angle) === 45 && Math.abs(last) === 45 ? last : angle
  }

  const commit = (next: ImageCropValue, options: CommitOptions = {}) => {
    if (value === undefined) setUncontrolled(next)
    if (options.animate) spring()
    const last = options.straighten ?? end
    if (options.straighten !== undefined) setEnd(options.straighten)
    clearTimeout(announcing.current)
    if (scene && !options.quiet) {
      const said = describe(next, scene, straighten(next.rotation, last))
      announcing.current = setTimeout(() => setMessage(said), ANNOUNCE_MS)
    }
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
        min,
        label,
        scene,
        setScene,
        shown: scene && fitCrop(current, scene),
        value: current,
        commit,
        straighten,
        springs,
        preview,
        setPainter,
        nudge,
        nudges
      }}
    >
      <div
        data-slot='image-crop'
        className={cn('@container grid gap-3', className)}
        {...props}
      >
        {children ?? (
          <>
            <ImageCropStage />
            <ImageCropControls />
          </>
        )}
        <p role='status' aria-live='polite' className='sr-only'>
          {message}
        </p>
      </div>
    </ImageCropContext>
  )
}
