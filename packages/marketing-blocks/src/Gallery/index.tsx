'use client'

import {
  type FocusEvent,
  Fragment,
  type ReactNode,
  useId,
  useState
} from 'react'

import { PauseIcon, PlayIcon } from '@phosphor-icons/react/ssr'

import { IconButton } from '@oztix/roadie-components/button'
import { Carousel } from '@oztix/roadie-components/carousel'
import { Marquee } from '@oztix/roadie-components/marquee'

import type { BlockImage } from '../Provider'
import { BlockHeading } from '../_shared/BlockHeading'
import { BlockImg } from '../_shared/BlockImg'
import { BlockRoot } from '../_shared/BlockRoot'
import { presetOf } from '../_shared/presets'
import { type GalleryPreset, galleryDefinition } from './definition'

export type { GalleryPreset } from './definition'

export type GalleryProps = {
  /**
   * `carousel` steps through portrait photos with previous and next controls or a swipe; `marquee` scrolls them past.
   * @default 'carousel'
   */
  preset?: GalleryPreset
  /** The block's place on the page, counting from 1, reported with its events. */
  position?: number
  /** An id for linking to the block. */
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
  images: readonly BlockImage[]
}

const MARQUEE_SPEED = 40

/** Shows the people and events behind a page in photos. */
export function Gallery({
  preset: presetName,
  position,
  id,
  eyebrow,
  title,
  titleHighlight,
  description,
  images
}: GalleryProps) {
  const headingId = useId()
  const { name, variant } = presetOf(galleryDefinition, presetName)

  const heading = (
    <BlockHeading
      id={headingId}
      eyebrow={eyebrow}
      title={title}
      titleHighlight={titleHighlight}
      description={description}
      align={name === 'carousel' ? 'start' : 'center'}
    />
  )
  const tiles = images.map((image, index) => ({
    key: `${index}-${image.src}`,
    tile: <PhotoTile image={image} />
  }))

  return (
    <BlockRoot
      block={galleryDefinition.name}
      variant={variant}
      preset={name}
      position={position}
      id={id}
      // The carousel is the landmark the heading names; naming both repeats it.
      aria-labelledby={name === 'carousel' ? undefined : headingId}
      className='grid grid-cols-1 gap-12'
    >
      {name === 'carousel' ? (
        <Carousel className='container-8xl min-w-0'>
          <Carousel.Header>
            <Carousel.Title id={headingId} render={() => heading} />
            <Carousel.Controls>
              <Carousel.Previous />
              <Carousel.Next />
            </Carousel.Controls>
          </Carousel.Header>
          <Carousel.Content>
            {tiles.map(({ key, tile }) => (
              <Carousel.Item key={key} className='basis-auto'>
                {tile}
              </Carousel.Item>
            ))}
          </Carousel.Content>
        </Carousel>
      ) : (
        <>
          <div className='container-8xl'>{heading}</div>
          <PausableMarquee>
            {tiles.map(({ key, tile }) => (
              <Fragment key={key}>{tile}</Fragment>
            ))}
          </PausableMarquee>
        </>
      )}
    </BlockRoot>
  )
}

// WCAG 2.2.2: motion past five seconds needs a way to stop it.
function PausableMarquee({ children }: { children: ReactNode }) {
  const [stopped, setStopped] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const leave = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
  }

  return (
    <div
      className='grid grid-cols-1 gap-4'
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={leave}
    >
      <Marquee speed={MARQUEE_SPEED} paused={stopped || hovered || focused}>
        {children}
      </Marquee>
      <div className='container-8xl flex justify-end'>
        <IconButton
          size='icon-sm'
          aria-label={stopped ? 'Play gallery' : 'Pause gallery'}
          onClick={() => setStopped(!stopped)}
        >
          {stopped ? (
            <PlayIcon weight='bold' className='size-4 text-subtle' />
          ) : (
            <PauseIcon weight='bold' className='size-4 text-subtle' />
          )}
        </IconButton>
      </div>
    </div>
  )
}

function PhotoTile({ image }: { image: BlockImage }) {
  return (
    <div className='aspect-9/16 w-35 shrink-0 overflow-hidden rounded-3xl @xl:w-45 @4xl:w-55'>
      <BlockImg
        image={image}
        sizes='(max-width: 640px) 140px, (max-width: 960px) 180px, 220px'
        className='size-full object-cover'
      />
    </div>
  )
}
