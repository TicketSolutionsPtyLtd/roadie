import type { ImageProps } from 'next/image'
import NextImage from 'next/image'

import { getAssetPath } from '@/utils/getAssetPath'

/**
 * Image component that automatically handles base path for src
 */
export function Image({ src, ...props }: ImageProps) {
  // Only transform src if it starts with a forward slash
  const imageSrc = src?.toString().startsWith('/')
    ? getAssetPath(src.toString())
    : src
  return <NextImage src={imageSrc} {...props} />
}
