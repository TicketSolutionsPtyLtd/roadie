'use client'

import { useState } from 'react'

import { ImageIcon } from '@phosphor-icons/react'

import { cn } from '@oztix/roadie-core/utils'

import { Image } from '../Image'
import type { RecordPart } from './types'

export type RecordImageProps = {
  part: RecordPart
  row: object
  /** A card's 16:9 banner rather than a 40px thumbnail. */
  banner?: boolean
  /** A banner's `sizes`. @default a phone's full width, up to 40rem */
  sizes?: string
}

const shapeClass = (banner: boolean) =>
  banner ? 'aspect-video w-full' : 'size-10 shrink-0 rounded-md'

/** A record's image, or a neutral tile when it has none, never a broken image. */
export function RecordImage({
  part,
  row,
  banner = false,
  sizes = '(max-width: 40rem) 100vw, 40rem'
}: RecordImageProps) {
  const src = (row as Record<string, unknown>)[part.key]
  const [failed, setFailed] = useState<unknown>(undefined)
  if (typeof src !== 'string' || src === '' || failed === src)
    return (
      <span
        data-slot='record-image-placeholder'
        className={cn(
          'grid place-items-center bg-subtle text-subtle',
          shapeClass(banner)
        )}
      >
        <ImageIcon
          weight='bold'
          aria-hidden
          className={banner ? 'size-6' : 'size-4'}
        />
      </span>
    )
  return (
    <Image
      src={src}
      alt={part.alt?.(row) ?? ''}
      loading='lazy'
      onError={() => setFailed(src)}
      {...(banner
        ? { width: 640, height: 360, sizes }
        : { width: 40, height: 40 })}
      className={cn('block bg-subtle object-cover', shapeClass(banner))}
    />
  )
}
