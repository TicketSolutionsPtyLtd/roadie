'use client'

import { type ComponentProps, type KeyboardEvent, useState } from 'react'

import type { ImageCropValue } from '@oztix/roadie-core/image'
import { cn } from '@oztix/roadie-core/utils'

import { Slider } from '../Slider'
import { useImageCropContext } from './ImageCropContext'
import { rotateBy, sameCrop, straightenOf } from './cropState'

export type ImageCropStraightenProps = ComponentProps<'div'>

const LIMIT = 45
// A drag this close to level snaps to it.
const DETENT = 0.8
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
 * drag snaps to level near 0°. The arrows step 1°, or 5° with Shift.
 */
export function ImageCropStraighten({
  className,
  ...props
}: ImageCropStraightenProps) {
  const crop = useImageCropContext('ImageCrop.Straighten')
  const { scene, shown } = crop
  // Where the thumb is mid-drag, while only the transform follows it.
  const [dragging, setDragging] = useState<number>()
  // ±45° is the same picture as the next quarter turn's ∓45°, so the dial
  // keeps the end it was last set to.
  const [last, setLast] = useState(0)
  let angle = shown ? straightenOf(shown.rotation) : 0
  if (Math.abs(angle) === LIMIT && Math.abs(last) === LIMIT) angle = last

  // The value at `to`, turned from the crop on screen.
  const turned = (to: number): ImageCropValue | undefined => {
    if (!scene || !shown) return undefined
    return rotateBy(shown, tenth(to - angle), scene)
  }
  const settle = (to: number) => {
    setLast(to)
    const next = turned(to)
    if (next && shown && !sameCrop(next, shown)) crop.commit(next)
  }
  const snap = (value: number) => (Math.abs(value) < DETENT ? 0 : tenth(value))

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
          <Slider.Track>
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
