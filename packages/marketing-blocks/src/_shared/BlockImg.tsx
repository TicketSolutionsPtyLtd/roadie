'use client'

import { Image } from '@oztix/roadie-components/image'

import type { BlockImage, RenderImageProps } from '../Provider'
import { useMarketingBlocks } from './context'

export type BlockImgProps = Omit<RenderImageProps, keyof BlockImage> & {
  image: BlockImage
}

/** A block image, drawn by the provider's `renderImage` when there is one. */
export function BlockImg({ image, ...props }: BlockImgProps) {
  const { renderImage } = useMarketingBlocks()
  if (renderImage) return renderImage({ ...image, ...props })
  return <Image {...image} {...props} />
}
