'use client'

import { type ComponentProps, useState } from 'react'

import { MinusIcon, PlusIcon } from '@phosphor-icons/react'

import { cn } from '@oztix/roadie-core/utils'

import { IconButton } from '../Button'
import { Slider } from '../Slider'
import { useImageCropContext } from './ImageCropContext'
import { sameCrop, zoomRange, zoomTo } from './cropState'

export type ImageCropZoomProps = ComponentProps<'div'>

const BUTTON_ZOOM = 1.25

/**
 * A zoom slider between − and +. It runs from covering the frame to the
 * minimum crop, evenly on a log scale. On a narrow crop it drops − and +.
 */
export function ImageCropZoom({ className, ...props }: ImageCropZoomProps) {
  const crop = useImageCropContext('ImageCrop.Zoom')
  const { scene, shown } = crop
  // Where the thumb is mid-drag, while only the transform follows it.
  const [dragging, setDragging] = useState<number>()
  const { cover, max } =
    scene && shown ? zoomRange(scene, shown.rotation) : { cover: 1, max: 1 }
  const span = Math.log(max / cover)
  const at = (position: number) => cover * Math.exp(position * span)
  const position = shown && span ? Math.log(shown.zoom / cover) / span : 0

  const step = (factor: number) => () => {
    if (!scene || !shown) return
    if (factor > 1 && shown.zoom >= max * 0.999) crop.nudge()
    const next = zoomTo(shown, shown.zoom * factor, scene)
    if (!sameCrop(next, shown)) crop.commit(next, { animate: true })
  }
  const button = 'rounded-full @max-md:hidden'

  return (
    <div className={cn('flex items-center gap-1', className)} {...props}>
      <IconButton
        aria-label='Zoom out'
        size='sm'
        emphasis='subtler'
        className={button}
        onClick={step(1 / BUTTON_ZOOM)}
      >
        <MinusIcon weight='bold' className='size-4' />
      </IconButton>
      <Slider
        size='sm'
        min={0}
        max={1}
        step={0.02}
        largeStep={0.2}
        disabled={!span}
        value={dragging ?? position}
        onValueChange={(value) => {
          if (!scene || !shown) return
          setDragging(value)
          crop.preview(zoomTo(shown, at(value), scene))
        }}
        onValueCommitted={(value) => {
          setDragging(undefined)
          crop.preview(null)
          if (!scene || !shown) return
          const next = zoomTo(shown, at(value), scene)
          if (!sameCrop(next, shown)) crop.commit(next)
        }}
        className='w-28 px-2 @md:w-40'
      >
        <Slider.Control>
          <Slider.Track>
            <Slider.Indicator />
            <Slider.Thumb
              aria-label='Zoom'
              getAriaValueText={(_, value) =>
                `${Math.round((at(value) / cover) * 100)}%`
              }
            />
          </Slider.Track>
        </Slider.Control>
      </Slider>
      <IconButton
        aria-label='Zoom in'
        size='sm'
        emphasis='subtler'
        className={button}
        onClick={step(BUTTON_ZOOM)}
      >
        <PlusIcon weight='bold' className='size-4' />
      </IconButton>
    </div>
  )
}
