import { cn } from '@oztix/roadie-core/utils'

import { Image } from '../Image'
import type { RecordPart } from './types'

export type RecordImageProps = {
  part: RecordPart
  row: object
  /** A card's 16:9 banner rather than a 40px thumbnail. */
  banner?: boolean
}

const shapeClass = (banner: boolean) =>
  banner ? 'aspect-video w-full' : 'size-10 shrink-0 rounded-md'

/** A record's image, or a neutral tile when it has none, never a broken image. */
export function RecordImage({ part, row, banner = false }: RecordImageProps) {
  const src = (row as Record<string, unknown>)[part.key]
  if (typeof src !== 'string' || src === '')
    return (
      <span
        data-slot='record-image-placeholder'
        className={cn('block bg-subtle', shapeClass(banner))}
      />
    )
  return (
    <Image
      src={src}
      alt={part.alt?.(row) ?? ''}
      loading='lazy'
      {...(banner
        ? { width: 640, height: 360, sizes: '(max-width: 40rem) 100vw, 40rem' }
        : { width: 40, height: 40 })}
      className={cn('block bg-subtle object-cover', shapeClass(banner))}
    />
  )
}
