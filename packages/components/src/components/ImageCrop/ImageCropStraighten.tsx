'use client'

import {
  type ComponentProps,
  type KeyboardEvent,
  useRef,
  useState
} from 'react'

import type { ImageCropValue } from '@oztix/roadie-core/image'
import { cn } from '@oztix/roadie-core/utils'

import { Slider } from '../Slider'
import { useImageCropContext } from './ImageCropContext'
import { rotateBy, sameCrop } from './cropState'

export type ImageCropStraightenProps = ComponentProps<'div'>

const LIMIT = 45
// A drag this close to level, in px along the dial, snaps to it.
const DETENT_PX = 3
const TICKS = [-45, -30, -15, 0, 15, 30, 45]

const tenth = (n: number) => Math.round(n * 10) / 10

/** How a screen reader says an angle: "3 degrees right". */
export function degreesText(angle: number) {
  const size = Math.abs(tenth(angle))
  if (!size) return '0 degrees'
  return `${size} ${size === 1 ? 'degree' : 'degrees'} ${angle > 0 ? 'right' : 'left'}`
}

/**
 * A dial that straightens the image up to 45° either way, on top of its
 * quarter turns. It zooms in just enough to keep the frame covered, and a
 * drag snaps to level within 3px of 0°. The arrows step 1°, or 5° with Shift.
 */
export function ImageCropStraighten({
  className,
  ...props
}: ImageCropStraightenProps) {
  const crop = useImageCropContext('ImageCrop.Straighten')
  const { scene, shown } = crop
  // Where the thumb is mid-drag, while only the transform follows it.
  const [dragging, setDragging] = useState<number>()
  const trackRef = useRef<HTMLDivElement>(null)
  const angle = shown ? crop.straighten(shown.rotation) : 0

  // The value at `to`, turned from the crop on screen.
  const turned = (to: number): ImageCropValue | undefined => {
    if (!scene || !shown) return undefined
    return rotateBy(shown, tenth(to - angle), scene)
  }
  const settle = (to: number) => {
    const next = turned(to)
    if (next && shown && !sameCrop(next, shown))
      crop.commit(next, { straighten: to })
  }
  // The detent is in px, so it's as easy to find on a narrow dial as a wide one.
  const snap = (value: number) => {
    const span = trackRef.current?.clientWidth
    const detent = span ? (DETENT_PX * LIMIT * 2) / span : 0
    return Math.abs(value) < detent ? 0 : tenth(value)
  }

  // Base UI steps the arrows by `step`, which is fine for a drag, so the
  // arrows step whole degrees here instead.
  const handleKeyDown = (
    event: KeyboardEvent<HTMLInputElement> & {
      preventBaseUIHandler: () => void
    }
  ) => {
    const sign = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[
      event.key
    ]
    if (!sign) return
    event.preventBaseUIHandler()
    event.preventDefault()
    // It wins over a wheel zoom still settling, as a slider's change does.
    crop.preview(null)
    const size = event.shiftKey ? 5 : 1
    const to = angle + sign * size
    settle(Math.max(-LIMIT, Math.min(LIMIT, to)))
  }

  return (
    <div className={cn('flex items-center gap-1', className)} {...props}>
      <Slider
        size='sm'
        min={-LIMIT}
        max={LIMIT}
        step={0.1}
        largeStep={5}
        disabled={!scene || !shown}
        value={dragging ?? angle}
        onValueChange={(value) => {
          const to = snap(value)
          setDragging(to)
          const next = turned(to)
          if (next) crop.preview(next)
        }}
        onValueCommitted={(value) => {
          setDragging(undefined)
          crop.preview(null)
          settle(snap(value))
        }}
        className='w-24 px-2 @lg:w-36'
      >
        <Slider.Control>
          <Slider.Track ref={trackRef}>
            {TICKS.map((tick) => (
              <span
                key={tick}
                aria-hidden
                className={cn(
                  'pointer-events-none absolute top-1/2 -translate-1/2 border-l border-strong',
                  tick ? 'h-2' : 'h-3'
                )}
                style={{ left: `${((tick + LIMIT) / (LIMIT * 2)) * 100}%` }}
              />
            ))}
            <Slider.Thumb
              aria-label='Straighten'
              getAriaValueText={(_, value) => degreesText(value)}
              onKeyDown={handleKeyDown}
            />
          </Slider.Track>
        </Slider.Control>
      </Slider>
      <span
        aria-hidden
        className='w-10 text-xs font-semibold text-subtle tabular-nums @max-lg:hidden'
      >
        {`${tenth(dragging ?? angle)}°`}
      </span>
    </div>
  )
}
