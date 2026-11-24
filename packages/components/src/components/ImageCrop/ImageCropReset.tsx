'use client'

import { ArrowsCounterClockwiseIcon } from '@phosphor-icons/react'

import { cropValueAt } from '@oztix/roadie-core/image'

import { IconButton, type IconButtonProps } from '../Button'
import { useImageCropContext } from './ImageCropContext'
import { fitCrop, sameCrop } from './cropState'

export type ImageCropResetProps = Omit<IconButtonProps, 'aria-label'> & {
  /** @default 'Reset crop' */
  'aria-label'?: string
}

/**
 * Springs back to the centred crop that covers the frame, unturned, or the
 * whole image in free-form. It shows only once the crop has moved from there.
 */
export function ImageCropReset({ onClick, ...props }: ImageCropResetProps) {
  const { scene, shown, commit } = useImageCropContext('ImageCrop.Reset')
  // A free-form crop goes back to the whole image, its frame with it.
  const whole = { x: 0, y: 0, width: 100, height: 100 }
  const start =
    scene &&
    (scene.bounds
      ? cropValueAt({ percent: whole }, scene.frame, scene.image)
      : fitCrop(undefined, scene))
  return (
    <IconButton
      aria-label='Reset crop'
      size='sm'
      emphasis='subtler'
      className='rounded-full'
      hidden={!start || !shown || sameCrop(start, shown)}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented || !start) return
        // It hides once pressed, so focus goes to the crop area.
        event.currentTarget
          .closest('[data-slot="image-crop"]')
          ?.querySelector<HTMLElement>('[aria-roledescription="image crop"]')
          ?.focus()
        commit(start, { animate: true })
      }}
      {...props}
    >
      <ArrowsCounterClockwiseIcon weight='bold' className='size-4' />
    </IconButton>
  )
}
