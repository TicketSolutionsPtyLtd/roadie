import { useId } from 'react'

import { Marquee } from '@oztix/roadie-components/marquee'

import type { BlockImage } from '../Provider'
import { BlockHeading } from '../_shared/BlockHeading'
import { BlockImg } from '../_shared/BlockImg'
import { BlockRoot } from '../_shared/BlockRoot'
import { presetOf } from '../_shared/presets'
import { type MediaPreset, mediaDefinition } from './definition'

export type { MediaPreset } from './definition'

export type MediaProps = {
  /**
   * `gallery` scrolls portrait photos past in a marquee.
   * @default 'gallery'
   */
  preset?: MediaPreset
  /** The block's place on the page, counting from 1, reported with its events. */
  position?: number
  /** The section's `id`, for linking to it. */
  id?: string
  /** A short line above the title. */
  eyebrow?: string
  /** The section heading. */
  title: string
  /** Words in the title to mark, such as `trust Oztix`. */
  titleHighlight?: string | string[]
  /** A sentence under the title. */
  description?: string
  /** Photos of people and events, cropped to portrait 9:16 tiles. Never logos. */
  images: BlockImage[]
}

const MARQUEE_SPEED = 40

/** Shows the people and events behind a page in photos. */
export function Media({
  preset: presetName,
  position,
  id,
  eyebrow,
  title,
  titleHighlight,
  description,
  images
}: MediaProps) {
  const headingId = useId()
  const preset = presetOf(mediaDefinition, presetName)

  return (
    <BlockRoot
      block={mediaDefinition.name}
      variant={preset.variant}
      preset={preset.name}
      position={position}
      id={id}
      aria-labelledby={headingId}
      className='grid gap-12 py-24 lg:py-32'
    >
      <BlockHeading
        id={headingId}
        eyebrow={eyebrow}
        title={title}
        titleHighlight={titleHighlight}
        description={description}
        className='container-8xl'
      />
      <Marquee speed={MARQUEE_SPEED}>
        {images.map((image) => (
          <div
            key={image.src}
            className='aspect-9/16 w-35 shrink-0 overflow-hidden rounded-3xl md:w-45 lg:w-55'
          >
            <BlockImg
              image={image}
              sizes='(max-width: 768px) 140px, (max-width: 1024px) 180px, 220px'
              className='size-full object-cover'
            />
          </div>
        ))}
      </Marquee>
    </BlockRoot>
  )
}
