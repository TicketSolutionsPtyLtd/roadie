'use client'

import { type FocusEvent, Fragment, type ReactNode, useState } from 'react'

import { PauseIcon, PlayIcon } from '@phosphor-icons/react/ssr'

import { IconButton } from '@oztix/roadie-components/button'
import { Card } from '@oztix/roadie-components/card'
import { Carousel } from '@oztix/roadie-components/carousel'
import { Marquee } from '@oztix/roadie-components/marquee'
import { cn } from '@oztix/roadie-core/utils'

import type { BlockAction, BlockImage } from '../Provider'
import { BlockActions } from '../_shared/BlockActions'
import { BlockHeading } from '../_shared/BlockHeading'
import { BlockImg } from '../_shared/BlockImg'
import { BlockRoot } from '../_shared/BlockRoot'
import { BLEED, BlockSurface, PAGE_GUTTER } from '../_shared/BlockSurface'
import { presetOf } from '../_shared/presets'
import {
  type BlockAlign,
  type BlockEmphasis,
  type BlockIntent,
  type BlockRatio,
  type BlockSize,
  gapOf
} from '../_shared/surface'
import { useBlock } from '../_shared/useBlock'
import { type GalleryPreset, galleryDefinition } from './definition'

export type { GalleryPreset } from './definition'

/** A photo or logo, linked when it has an `href`. A linked image is named by its `alt`. */
export type GalleryImage = BlockImage & { href?: string }

// Logos are `natural`: uncropped, at one height.
type TileRatio = BlockRatio | 'natural'

export type GalleryProps = {
  /**
   * `carousel` steps through the photos with previous, dot, and next controls under them, or a swipe, `marquee` scrolls them past, and `logos` sets logos uncropped in a wrapping, centred row.
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
  highlight?: string | string[]
  /** A sentence under the title. */
  description?: string
  /** Photos of people and events, or partners' logos for `logos`. */
  images: readonly GalleryImage[]
  /**
   * The photos' shape in `carousel` and `marquee`. `logos` keeps each logo's own proportions at one height.
   * @default 'portrait'
   */
  ratio?: BlockRatio
  /** Links under the photos, as buttons. The first is the strong one. */
  actions?: readonly BlockAction[]
  /** The block's intent, for the highlighted words, the marquee's pause control, and the strong action. */
  intent?: BlockIntent
  /** The surface behind the block. Without one, the photos sit on the page and the marquee runs its full width. */
  emphasis?: BlockEmphasis
  /** Draws the surface inside the page's padding, rounded at every width, instead of as a full-width band. */
  contained?: boolean
  /**
   * Where the heading and actions line up: `center` for every preset.
   */
  align?: BlockAlign
  /**
   * `md` and `sm` set the title one and two steps smaller, with tighter spacing.
   * @default 'lg'
   */
  size?: BlockSize
}

// Literal class names, so Tailwind finds them. Widths step up with the block's own width.
const CROPPED: Record<BlockRatio, { tile: string; sizes: string }> = {
  portrait: {
    tile: 'aspect-9/16 w-35 @xl:w-45 @4xl:w-55',
    sizes: '(max-width: 640px) 140px, (max-width: 960px) 180px, 220px'
  },
  square: {
    tile: 'aspect-square w-40 @xl:w-50 @4xl:w-60',
    sizes: '(max-width: 640px) 160px, (max-width: 960px) 200px, 240px'
  },
  landscape: {
    tile: 'aspect-2/1 w-72 @xl:w-96 @4xl:w-112',
    sizes: '(max-width: 640px) 288px, (max-width: 960px) 384px, 448px'
  }
}

const NATURAL_HEIGHT = 48

const MARQUEE_SPEED = 40

/** Shows the people, events, and partners behind a page in photos or logos. */
export function Gallery(props: GalleryProps) {
  const { images, actions, intent, emphasis, size } = props
  const block = useBlock(galleryDefinition, props)
  const { name } = block
  const preset = presetOf(galleryDefinition, name)
  const readsRatio = (preset.fields as readonly string[]).includes('ratio')
  const ratio: TileRatio =
    (readsRatio ? props.ratio : undefined) ?? preset.defaults.ratio
  const headingId = block.heading.id
  const gap = gapOf(size, 'loose')
  const heading = <BlockHeading {...block.heading} />
  const tiles = images.map((image, index) => ({
    key: `${index}-${image.src}`,
    tile: <Tile image={image} ratio={ratio} />
  }))
  const blockActions = <BlockActions {...block.actions} />
  const marquee = name === 'marquee' && (
    <PausableMarquee intent={intent}>
      {tiles.map(({ key, tile }) => (
        <Fragment key={key}>{tile}</Fragment>
      ))}
    </PausableMarquee>
  )
  // On the page the marquee runs the block's full width, so it sits outside the content's measure.
  const onPage = emphasis == null

  return (
    <BlockRoot
      {...block.root}
      // The carousel is the landmark the heading names; naming both repeats it.
      aria-labelledby={name === 'carousel' ? undefined : headingId}
      className={cn('grid grid-cols-1', gap)}
    >
      {name === 'carousel' ? (
        <BlockSurface
          emphasis={block.emphasis}
          contained={block.contained}
          className={cn('grid min-w-0 grid-cols-1', gap)}
        >
          <Carousel className={cn('grid min-w-0 grid-cols-1', gap)}>
            <Carousel.Title id={headingId} render={() => heading} />
            {/* On a surface the photos run to its edges, padded to start in line
                with the heading, and clip there rather than fade to the page. */}
            <Carousel.Content
              overflow={onPage ? undefined : 'hidden'}
              className={onPage ? undefined : cn(BLEED, 'px-(--block-gutter)')}
            >
              {tiles.map(({ key, tile }) => (
                <Carousel.Item key={key} className='basis-auto'>
                  {tile}
                </Carousel.Item>
              ))}
            </Carousel.Content>
            {/* Under the photos they move, so the heading keeps its full width. */}
            <Carousel.Controls className='flex gap-4 justify-self-center'>
              <Carousel.Previous />
              <Carousel.Dots />
              <Carousel.Next />
            </Carousel.Controls>
          </Carousel>
          {blockActions}
        </BlockSurface>
      ) : name === 'logos' ? (
        <BlockSurface
          emphasis={block.emphasis}
          contained={block.contained}
          className={cn('grid grid-cols-1', gap)}
        >
          {heading}
          <ul
            className={cn(
              'flex flex-wrap items-center justify-center',
              ratio === 'natural' ? 'gap-x-12 gap-y-8' : 'gap-4 @xl:gap-6'
            )}
          >
            {tiles.map(({ key, tile }) => (
              <li key={key}>{tile}</li>
            ))}
          </ul>
          {blockActions}
        </BlockSurface>
      ) : onPage ? (
        <>
          <BlockSurface>{heading}</BlockSurface>
          <div className={PAGE_GUTTER}>{marquee}</div>
          {actions && actions.length > 0 && (
            <BlockSurface>{blockActions}</BlockSurface>
          )}
        </>
      ) : (
        <BlockSurface
          emphasis={block.emphasis}
          contained={block.contained}
          className={cn('grid grid-cols-1', gap)}
        >
          {heading}
          <div className={BLEED}>{marquee}</div>
          {blockActions}
        </BlockSurface>
      )}
    </BlockRoot>
  )
}

// WCAG 2.2.2: motion past five seconds needs a way to stop it.
function PausableMarquee({
  intent,
  children
}: {
  intent?: BlockIntent
  children: ReactNode
}) {
  const [stopped, setStopped] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const leave = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
  }

  return (
    <div className='relative grid grid-cols-1'>
      <div
        className='grid grid-cols-1'
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={leave}
      >
        <Marquee speed={MARQUEE_SPEED} paused={stopped || hovered || focused}>
          {children}
        </Marquee>
      </div>
      {/* Over the photos' lower corner, lined up with the page's content edge. */}
      <div className='pointer-events-none absolute inset-x-0 bottom-3 mx-auto flex w-full max-w-8xl justify-end px-(--block-gutter) *:pointer-events-auto'>
        <IconButton
          size='icon-sm'
          intent={intent}
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

// An image without both dimensions has no ratio to size by, so it asks for a
// width that fits most wordmarks at the natural height.
function naturalSizes({ width, height }: BlockImage) {
  const ratio = width && height ? width / height : 4
  return `${Math.round(NATURAL_HEIGHT * ratio)}px`
}

// A linked image is the link, named by its alt text, so the image inside is decorative.
function Tile({ image, ratio }: { image: GalleryImage; ratio: TileRatio }) {
  const { href, ...rest } = image
  const shown = href ? { ...rest, alt: '' } : rest
  if (ratio === 'natural') {
    const logo = (
      <BlockImg
        image={shown}
        sizes={naturalSizes(rest)}
        className='h-12 w-auto object-contain'
      />
    )
    if (!href) return logo
    return (
      <Card href={href} emphasis='subtler' aria-label={rest.alt}>
        <Card.Content>{logo}</Card.Content>
      </Card>
    )
  }
  const photo = (
    <div
      className={cn(
        'shrink-0 overflow-hidden rounded-3xl',
        CROPPED[ratio].tile
      )}
    >
      <BlockImg
        image={shown}
        sizes={CROPPED[ratio].sizes}
        className={cn(
          'size-full object-cover',
          href &&
            'transition-[scale] duration-moderate ease-standard motion-safe:group-focus-within/tile:scale-105 motion-safe:group-hover/tile:scale-105'
        )}
      />
    </div>
  )
  if (!href) return photo
  return (
    <div className='group/tile is-interactive-within rounded-3xl'>
      <Card.Link href={href} aria-label={rest.alt} className='block'>
        {photo}
      </Card.Link>
    </div>
  )
}
