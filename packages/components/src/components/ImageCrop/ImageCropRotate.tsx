'use client'

import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react'

import { IconButton, type IconButtonProps } from '../Button'
import { useImageCropContext } from './ImageCropContext'
import { rotateBy } from './cropState'

export type ImageCropRotateProps = Omit<IconButtonProps, 'aria-label'> & {
  /** @default 'Rotate left' */
  'aria-label'?: string
}

/** Turns the image 90° left, with a spring. `R` on the Stage does too. */
export function ImageCropRotate({ onClick, ...props }: ImageCropRotateProps) {
  const { scene, shown, commit } = useImageCropContext('ImageCrop.Rotate')
  return (
    <IconButton
      aria-label='Rotate left'
      size='sm'
      emphasis='subtler'
      className='rounded-full'
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented || !scene || !shown) return
        commit(rotateBy(shown, -90, scene), { animate: true })
      }}
      {...props}
    >
      <ArrowCounterClockwiseIcon weight='bold' className='size-4' />
    </IconButton>
  )
}
