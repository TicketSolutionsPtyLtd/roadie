'use client'

import type { ReactNode } from 'react'

import { ImageIcon } from '@phosphor-icons/react/ssr'

import { Image } from '@oztix/roadie-components/image'
import { cn } from '@oztix/roadie-core/utils'

import { BlocksProvider, type RenderImageProps } from '../Provider'
import { useBlocks } from '../_shared/context'

const PLACEHOLDER_SRC = 'roadie-blocks:placeholder'

/** A part waiting on its image while it's edited, which `EditingImages` draws. */
export const PLACEHOLDER_IMAGE = { src: PLACEHOLDER_SRC, alt: '' }

// A box rather than an image, so it takes the page's surface and text
// colours in either mode, and centres its glyph wherever the block crops.
function Placeholder({ className }: { className?: string }) {
  return (
    <span
      data-slot='block-image-placeholder'
      className={cn(
        'aspect-3/2',
        className,
        'grid place-items-center bg-sunken text-subtler'
      )}
    >
      <ImageIcon weight='bold' className='size-8' aria-hidden />
    </span>
  )
}

/** Draws the blocks inside it with a placeholder for each image not yet set. */
export function EditingImages({ children }: { children: ReactNode }) {
  const { renderImage } = useBlocks()
  const draw = (image: RenderImageProps) => {
    if (image.src === PLACEHOLDER_SRC) {
      return <Placeholder className={image.className} />
    }
    return renderImage ? renderImage(image) : <Image {...image} />
  }
  return <BlocksProvider renderImage={draw}>{children}</BlocksProvider>
}
