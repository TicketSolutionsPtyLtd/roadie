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
  moveTo,
  panBy,
  rotateBy,
  sameCrop,
  stretchCrop,
  transformOf,
  zoomRange,
  zoomTo
} from './cropState'

export type ImageCropStageProps = ComponentProps<'div'>

type Point = { x: number; y: number }

const WHEEL_SETTLE_MS = 150
// `--duration-slow`, which the spring runs for, with a frame to spare.
const SPRING_MS = 320
const DOUBLE_TAP_MS = 300
const TAP_SLOP = 24
const KEY_ZOOM = 1.1
const radius = { rectangle: 'rounded-md', circle: 'rounded-full' }
const corners = [
  'top-0 left-0 border-t-3 border-l-3 rounded-tl-md',
  'top-0 right-0 border-t-3 border-r-3 rounded-tr-md',
  'bottom-0 left-0 border-b-3 border-l-3 rounded-bl-md',
  'bottom-0 right-0 border-b-3 border-r-3 rounded-br-md'
]

const midpoint = (points: Point[]) => ({
  x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
  y: points.reduce((sum, p) => sum + p.y, 0) / points.length
})
const spread = ([a, b]: Point[]) =>
  a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0

function sizeOf(value: ImageCropValue) {
  return `${Math.round(value.area.width)} × ${Math.round(value.area.height)}px`
}

/**
 * The crop area: the image under a fixed frame. Drag to pan and pinch to
 * zoom, or use the arrow keys, `+`, `-` and `R`, or the wheel once it has
 * focus.
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
  const sizeRef = useRef<HTMLSpanElement>(null)
  const [stage, setStage] = useState<CropSize>()
  const [loaded, setLoaded] = useState<{ src: string; size: CropSize }>()
  const [active, setActive] = useState(false)
  const [, repaint] = useReducer((n: number) => n + 1, 0)
  // The pointers down, in screen px from the frame's centre.
  const pointers = useRef(new Map<number, Point>())
  // The gesture they make, from the value and points it started at.
  const gesture = useRef<{
    src?: string
    start: ImageCropValue
    from: Point
    distance: number
    at: number
    moved: boolean
  }>(null)
  const lastTap = useRef<{ at: number } & Point>(null)
  // The value mid-gesture, the image it was made on, whether it ran past
  // the zoom cap, and the unclamped value a drag or pinch carries on from.
  const live = useRef<{
    src?: string
    value: ImageCropValue
    capped?: boolean
    raw?: ImageCropValue
  }>(null)
  const wheeling = useRef<ReturnType<typeof setTimeout>>(undefined)
  // The angle last painted, so a spring turns the short way round.
  const turn = useRef(0)
  const springs = useRef(crop.springs)
  const settling = useRef<ReturnType<typeof setTimeout>>(undefined)
  const describedBy = useId()

  const image = loaded && loaded.src === crop.src ? loaded.size : undefined
  const frame =
    stage && fitFrame(stage, crop.aspectRatio, stage.width < 480 ? 24 : 48)
  const scene: CropScene | undefined =
    frame && image && frame.width > 0
      ? { frame, image, min: crop.min }
      : undefined
  const shown = scene && fitCrop(crop.value, scene)
  const range = scene && shown && zoomRange(scene, shown.rotation)
  const capped = !!range && shown!.zoom >= range.max * 0.999 && !range.short
  const latest = useRef({ scene, shown, stage, crop, plain: false })

  // Mid-gesture only the transform and the size change, written here rather
  // than rendered.
  const paint = (value: ImageCropValue) => {
    const size = latest.current.scene?.image
    if (!imageRef.current || !size) return
    let angle = value.rotation
    while (angle - turn.current > 180) angle -= 360
    while (angle - turn.current < -180) angle += 360
    turn.current = angle
    imageRef.current.style.transform = transformOf(value, size, angle)
    // The chip says something else at the cap, and the render owns that.
    if (sizeRef.current && latest.current.plain)
      sizeRef.current.textContent = sizeOf(value)
  }

  const unsettle = () => {
    clearTimeout(settling.current)
    delete stageRef.current?.dataset.settling
  }
  // Springs the next transform painted, set with it so the change animates.
  const settle = () => {
    if (!stageRef.current) return
    stageRef.current.dataset.settling = ''
    clearTimeout(settling.current)
    settling.current = setTimeout(unsettle, SPRING_MS)
  }

  useLayoutEffect(() => {
    latest.current = {
      scene,
      shown,
      stage,
      crop,
      plain: !!range && !range.short && !capped
    }
    crop.setScene(scene)
    // A gesture on the last image ends unreported, as a new one starts centred.
    if (live.current && live.current.src !== crop.src) live.current = null
    // A control's change wins over a gesture under way, which waits for
    // the pointers to lift.
    if (springs.current !== crop.springs) {
      springs.current = crop.springs
      live.current = null
      gesture.current = null
      settle()
    }
    if (shown && !live.current) paint(shown)
  })
  useEffect(
    () => () => {
      clearTimeout(settling.current)
      clearTimeout(wheeling.current)
    },
    []
  )

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
    if (!crop.value || !sameCrop(crop.value, shown))
      crop.commit(shown, { quiet: true })
  }, [crop, shown])

  // Ends a gesture: report once, then paint whatever value the parent kept.
  // A value stretched past a limit springs back.
  const finish = (animate = false) => {
    const ended = live.current
    const { shown, crop } = latest.current
    live.current = null
    setActive(false)
    if (ended?.capped) crop.nudge()
    if (animate) settle()
    if (ended && !(shown && sameCrop(ended.value, shown)))
      crop.commit(ended.value)
    repaint()
  }

  // Controls show a value mid-drag through here.
  useLayoutEffect(() => {
    const { setPainter } = crop
    setPainter((value) => {
      // It wins over a wheel zoom still settling.
      clearTimeout(wheeling.current)
      unsettle()
      setActive(!!value)
      live.current = value && { src: latest.current.crop.src, value }
      if (value) paint(value)
      else repaint()
    })
    return () => setPainter(null)
  })

  useEffect(() => {
    const element = stageRef.current
    if (!element) return
    const onWheel = (event: WheelEvent) => {
      const { scene, shown, crop } = latest.current
      // A trackpad pinch comes as a wheel with ctrlKey, and always zooms. A
      // plain wheel zooms only once the stage has focus.
      const pinch = event.ctrlKey
      if ((!pinch && document.activeElement !== element) || !scene || !shown)
        return
      // A wheel never scrolls the page here, but it waits out a drag.
      event.preventDefault()
      if (gesture.current) return
      unsettle()
      const rect = element.getBoundingClientRect()
      const lines = { 1: 16, 2: rect.height }[event.deltaMode] ?? 1
      const base = live.current?.value ?? shown
      const zoom =
        base.zoom * Math.exp(-event.deltaY * lines * (pinch ? 0.01 : 0.002))
      const value = zoomTo(base, zoom, scene, {
        x: event.clientX - rect.left - rect.width / 2,
        y: event.clientY - rect.top - rect.height / 2
      })
      const capped = zoom > zoomRange(scene, base.rotation).max * 1.001
      live.current = { src: crop.src, value, capped }
      paint(value)
      setActive(true)
      clearTimeout(wheeling.current)
      wheeling.current = setTimeout(finish, WHEEL_SETTLE_MS)
    }
    // Safari pinches a trackpad with its own gesture events, not a wheel,
    // and would zoom the page. On a touch screen pointers do the pinch.
    let base: ImageCropValue | null = null
    const onGesture = (event: Event) => {
      event.preventDefault()
      const { scene, shown, crop } = latest.current
      if (gesture.current || !scene || !shown) return
      const { type, scale, clientX, clientY } = event as Event &
        Record<'scale' | 'clientX' | 'clientY', number>
      if (type === 'gesturestart') {
        clearTimeout(wheeling.current)
        unsettle()
        base = live.current?.value ?? shown
        return
      }
      if (!base) return
      if (type === 'gestureend') {
        base = null
        return finish()
      }
      const rect = element.getBoundingClientRect()
      const zoom = base.zoom * scale
      const value = zoomTo(base, zoom, scene, {
        x: clientX - rect.left - rect.width / 2,
        y: clientY - rect.top - rect.height / 2
      })
      const capped = zoom > zoomRange(scene, base.rotation).max * 1.001
      live.current = { src: crop.src, value, capped }
      paint(value)
      setActive(true)
    }
    const gestures = ['gesturestart', 'gesturechange', 'gestureend']
    element.addEventListener('wheel', onWheel, { passive: false })
    for (const type of gestures) element.addEventListener(type, onGesture)
    return () => {
      element.removeEventListener('wheel', onWheel)
      for (const type of gestures) element.removeEventListener(type, onGesture)
    }
    // It reads everything it needs through `latest`, so it binds once.
  }, [])

  const pointOf = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: event.clientX - rect.left - rect.width / 2,
      y: event.clientY - rect.top - rect.height / 2
    }
  }

  // Starts the gesture again from the value on screen when a finger joins
  // or lifts, so the image doesn't jump.
  const begin = (at: number) => {
    const points = [...pointers.current.values()]
    // Carries on from the stretched value, not the clamped one.
    const start = live.current?.raw ?? live.current?.value ?? shown
    gesture.current =
      points.length && start
        ? {
            // A gesture begun on the last image stays on it.
            src: gesture.current?.src ?? crop.src,
            start,
            from: midpoint(points),
            distance: spread(points),
            at,
            moved: !!gesture.current?.moved
          }
        : null
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    onPointerDown?.(event)
    if (event.defaultPrevented || !scene || !shown) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const point = pointOf(event)
    const tap = lastTap.current
    lastTap.current = null
    if (
      !pointers.current.size &&
      !live.current &&
      tap &&
      event.timeStamp - tap.at < DOUBLE_TAP_MS &&
      Math.hypot(point.x - tap.x, point.y - tap.y) < TAP_SLOP
    ) {
      // Double-tap zooms to 2× at the tap, or back out to fit.
      const { cover } = zoomRange(scene, shown.rotation)
      unsettle()
      crop.commit(
        shown.zoom > cover * 1.08
          ? zoomTo(shown, cover, scene)
          : zoomTo(shown, cover * 2, scene, point),
        { animate: true }
      )
      return
    }
    // A synthetic pointer can't be captured, and needs no capture.
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Nothing to release either.
    }
    // A wheel zoom still settling carries on as this gesture, reported once.
    clearTimeout(wheeling.current)
    unsettle()
    pointers.current.set(event.pointerId, point)
    begin(event.timeStamp)
    setActive(true)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return
    pointers.current.set(event.pointerId, pointOf(event))
    const start = gesture.current
    // A gesture begun on the last image waits for the pointers to lift.
    if (!start || start.src !== crop.src || !scene || !stage) return
    const points = [...pointers.current.values()]
    const to = midpoint(points)
    const scale = start.distance ? spread(points) / start.distance : 1
    if (Math.hypot(to.x - start.from.x, to.y - start.from.y) > 4 || scale !== 1)
      start.moved = true
    const raw = moveTo(start.start, start.from, to, scale, scene)
    const { clamped, painted } = stretchCrop(raw, scene, stage)
    const capped = raw.zoom > zoomRange(scene, raw.rotation).max * 1.001
    live.current = { src: crop.src, value: clamped, capped, raw }
    paint(painted)
  }

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.delete(event.pointerId)) return
    const ended = gesture.current
    if (pointers.current.size) return begin(event.timeStamp)
    gesture.current = null
    const tapped =
      ended && !ended.moved && event.timeStamp - ended.at < DOUBLE_TAP_MS
    lastTap.current = tapped ? { at: event.timeStamp, ...ended.from } : null
    finish(true)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event)
    if (event.defaultPrevented || event.target !== event.currentTarget) return
    // A key mid-gesture would be overwritten when the gesture ends.
    if (!scene || !shown || gesture.current || live.current) return
    // Arrows move the image, as a drag does, so the crop moves the other way.
    const step = (event.shiftKey ? 50 : 10) / shown.zoom
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step]
    }
    const move = moves[event.key]
    const zoomIn = event.key === '+' || event.key === '='
    const next = move
      ? panBy(shown, move[0], move[1], scene)
      : zoomIn
        ? zoomTo(shown, shown.zoom * KEY_ZOOM, scene)
        : event.key === '-' || event.key === '_'
          ? zoomTo(shown, shown.zoom / KEY_ZOOM, scene)
          : event.key === 'r' || event.key === 'R'
            ? rotateBy(shown, -90, scene)
            : undefined
    if (!next) return
    event.preventDefault()
    if (zoomIn && capped) crop.nudge()
    unsettle()
    // Keys move at once; a turn springs, as the button's does.
    if (!sameCrop(next, shown))
      crop.commit(next, { animate: next.rotation !== shown.rotation })
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
      onLostPointerCapture={handlePointerEnd}
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
            'pointer-events-none absolute top-1/2 left-1/2 max-w-none origin-center will-change-transform group-data-settling/crop:transition-transform group-data-settling/crop:duration-slow group-data-settling/crop:ease-spring',
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
          data-slot='image-crop-frame'
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
      {shown && range && (
        // The live region says the size; this is for sighted people.
        <span
          key={crop.nudges}
          ref={sizeRef}
          aria-hidden
          data-slot='image-crop-size'
          data-capped={capped || range.short || undefined}
          className={cn(
            'pointer-events-none absolute top-3 left-3 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums transition-colors duration-moderate ease-standard',
            capped || range.short
              ? 'intent-warning emphasis-strong'
              : 'emphasis-floating is-translucent',
            crop.nudges > 0 && 'animate-nudge'
          )}
        >
          {range.short && crop.min
            ? `Needs ${sizeOf({ ...shown, area: { ...shown.area, ...crop.min } })}`
            : capped
              ? `${sizeOf(shown)} · smallest crop`
              : sizeOf(shown)}
        </span>
      )}
      <p id={describedBy} className='sr-only'>
        Drag or use the arrow keys to move the image. Pinch, press plus or
        minus, or scroll once the crop area has focus to zoom. Press R to turn
        it left.
      </p>
    </div>
  )
}
