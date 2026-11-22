'use client'

import {
  type ComponentProps,
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useId,
  useLayoutEffect,
  useReducer,
  useRef,
  useState
} from 'react'

import type { CropSize, ImageCropValue } from '@oztix/roadie-core/image'
import { cn } from '@oztix/roadie-core/utils'

import { useImageCropContext } from './ImageCropContext'
import {
  type CropScene,
  fitCrop,
  fitFrame,
  panBy,
  sameCrop,
  transformOf,
  zoomTo
} from './cropState'

export type ImageCropStageProps = ComponentProps<'div'>

const WHEEL_SETTLE_MS = 150
const KEY_ZOOM = 1.1
const radius = { rectangle: 'rounded-md', circle: 'rounded-full' }
const corners = [
  'top-0 left-0 border-t-3 border-l-3 rounded-tl-md',
  'top-0 right-0 border-t-3 border-r-3 rounded-tr-md',
  'bottom-0 left-0 border-b-3 border-l-3 rounded-bl-md',
  'bottom-0 right-0 border-b-3 border-r-3 rounded-br-md'
]

/**
 * The crop area: the image under a fixed frame. Drag to pan, use the arrow
 * keys, `+` and `-`, or the wheel once it has focus.
 */
export function ImageCropStage({
  className,
  onKeyDown,
  onPointerDown,
  ...props
}: ImageCropStageProps) {
  const crop = useImageCropContext('ImageCrop.Stage')
  const stageRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const [stage, setStage] = useState<CropSize>()
  const [loaded, setLoaded] = useState<{ src: string; size: CropSize }>()
  const [active, setActive] = useState(false)
  const [, repaint] = useReducer((n: number) => n + 1, 0)
  const drag = useRef<{ id: number; x: number; y: number }>(null)
  const live = useRef<ImageCropValue>(null)
  const describedBy = useId()

  const image = loaded && loaded.src === crop.src ? loaded.size : undefined
  const frame =
    stage && fitFrame(stage, crop.aspectRatio, stage.width < 480 ? 24 : 48)
  const scene: CropScene | undefined =
    frame && image && frame.width > 0
      ? { frame, image, min: crop.min }
      : undefined
  const shown = scene && fitCrop(crop.value, scene)
  const latest = useRef({ scene, shown, commit: crop.commit })

  // Mid-gesture only the transform changes, written here rather than rendered.
  const paint = (value: ImageCropValue) => {
    const size = latest.current.scene?.image
    if (imageRef.current && size)
      imageRef.current.style.transform = transformOf(value, size)
  }

  useLayoutEffect(() => {
    latest.current = { scene, shown, commit: crop.commit }
    if (shown && !live.current) paint(shown)
  })

  useLayoutEffect(() => {
    const element = stageRef.current
    if (!element) return
    const measure = () => {
      const { width, height } = element.getBoundingClientRect()
      setStage((prev) =>
        prev?.width === width && prev.height === height
          ? prev
          : { width, height }
      )
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  // An image that loaded before hydration fires no load event.
  const readImage = () => {
    const element = imageRef.current
    if (!crop.src || !element?.complete || !element.naturalWidth) return
    const size = { width: element.naturalWidth, height: element.naturalHeight }
    setLoaded({ src: crop.src, size })
  }
  useLayoutEffect(readImage, [crop.src])

  // Report the default (or a value that didn't fit) once per image.
  const reported = useRef<string>(null)
  useEffect(() => {
    if (!shown || !crop.src || reported.current === crop.src) return
    reported.current = crop.src
    if (!crop.value || !sameCrop(crop.value, shown)) crop.commit(shown)
  }, [crop, shown])

  // Ends a gesture: report once, then paint whatever value the parent kept.
  const finish = () => {
    const value = live.current
    const { shown, commit } = latest.current
    live.current = null
    setActive(false)
    if (value && !(shown && sameCrop(value, shown))) commit(value)
    repaint()
  }

  useEffect(() => {
    const element = stageRef.current
    if (!element) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const onWheel = (event: WheelEvent) => {
      const { scene, shown } = latest.current
      if (document.activeElement !== element || !scene || !shown) return
      event.preventDefault()
      const rect = element.getBoundingClientRect()
      const lines = { 1: 16, 2: rect.height }[event.deltaMode] ?? 1
      const base = live.current ?? shown
      live.current = zoomTo(
        base,
        base.zoom * Math.exp(-event.deltaY * lines * 0.002),
        scene,
        {
          x: event.clientX - rect.left - rect.width / 2,
          y: event.clientY - rect.top - rect.height / 2
        }
      )
      paint(live.current)
      setActive(true)
      clearTimeout(timer)
      timer = setTimeout(finish, WHEEL_SETTLE_MS)
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      clearTimeout(timer)
      element.removeEventListener('wheel', onWheel)
    }
    // It reads everything it needs through `latest`, so it binds once.
  }, [])

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    onPointerDown?.(event)
    if (event.defaultPrevented || !shown || drag.current) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
    setActive(true)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current
    if (!start || start.id !== event.pointerId || !scene || !shown) return
    live.current = panBy(
      shown,
      -(event.clientX - start.x) / shown.zoom,
      -(event.clientY - start.y) / shown.zoom,
      scene
    )
    paint(live.current)
  }

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== event.pointerId) return
    drag.current = null
    finish()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event)
    if (event.defaultPrevented || event.target !== event.currentTarget) return
    if (!scene || !shown) return
    // Arrows move the image, as a drag does, so the crop moves the other way.
    const step = (event.shiftKey ? 50 : 10) / shown.zoom
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step]
    }
    const move = moves[event.key]
    const next = move
      ? panBy(shown, move[0], move[1], scene)
      : event.key === '+' || event.key === '='
        ? zoomTo(shown, shown.zoom * KEY_ZOOM, scene)
        : event.key === '-' || event.key === '_'
          ? zoomTo(shown, shown.zoom / KEY_ZOOM, scene)
          : undefined
    if (!next) return
    event.preventDefault()
    if (!sameCrop(next, shown)) crop.commit(next)
  }

  return (
    <div
      ref={stageRef}
      role='group'
      aria-roledescription='image crop'
      aria-label={crop.label}
      aria-describedby={describedBy}
      tabIndex={0}
      data-active={active || undefined}
      data-shape={crop.shape}
      className={cn(
        'group/crop relative aspect-[4/3] w-full cursor-grab touch-none overflow-hidden rounded-3xl bg-(--color-neutral-light-13) select-none is-focusable active:cursor-grabbing',
        className
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {crop.src && (
        <img
          ref={imageRef}
          src={crop.src}
          alt=''
          draggable={false}
          onLoad={readImage}
          className={cn(
            'pointer-events-none absolute top-1/2 left-1/2 max-w-none origin-center will-change-transform',
            !image && 'invisible'
          )}
          style={
            image && {
              width: image.width,
              height: image.height,
              marginLeft: -image.width / 2,
              marginTop: -image.height / 2
            }
          }
        />
      )}
      {frame && (
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute top-1/2 left-1/2 -translate-1/2 shadow-[0_0_0_1.5px_var(--color-neutral-light-0),0_0_0_100vmax_color-mix(in_oklab,var(--color-neutral-light-13)_60%,transparent)]',
            radius[crop.shape]
          )}
          style={{ width: frame.width, height: frame.height }}
        >
          <div
            className={cn(
              'absolute inset-0 overflow-hidden opacity-0 transition-opacity duration-moderate ease-standard group-data-active/crop:opacity-100',
              radius[crop.shape]
            )}
          >
            <div className='absolute inset-y-0 left-1/3 w-1/3 border-x border-(--color-neutral-light-0)/50' />
            <div className='absolute inset-x-0 top-1/3 h-1/3 border-y border-(--color-neutral-light-0)/50' />
          </div>
          {crop.shape === 'rectangle' &&
            corners.map((corner) => (
              <span
                key={corner}
                className={cn(
                  'absolute -m-0.75 size-4.5 border-(--color-neutral-light-0)',
                  corner
                )}
              />
            ))}
        </div>
      )}
      <p id={describedBy} className='sr-only'>
        Drag or use the arrow keys to move the image. Press plus or minus to
        zoom, or scroll once the crop area has focus.
      </p>
    </div>
  )
}
