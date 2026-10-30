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
  type BlockSize,
  bySize
} from '../_shared/surface'
import { type GalleryPreset, galleryDefinition } from './definition'

export type { GalleryPreset } from './definition'

/** A photo or logo, linked when it has an `href`. A linked image is named by its `alt`. */
export type GalleryImage = BlockImage & { href?: string }

/** The tiles' shape: cropped to `portrait` (9:16), `square`, or `landscape` (4:3), or `natural`, uncropped at one height. */
export type GalleryRatio = 'portrait' | 'square' | 'landscape' | 'natural'

export type GalleryProps = {
  /**
   * `carousel` steps through the images with previous and next controls or a swipe, `marquee` scrolls them past, and `wrap` sets them in a wrapping, centred row.
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
  /** Photos of people and events, or partners' logos with `ratio='natural'`. */
  images: readonly GalleryImage[]
  /**
   * The tiles' shape. `natural` keeps each image's own proportions at one height, for logos.
   * @default 'portrait'
   */
  ratio?: GalleryRatio
  /** Links under the photos, as buttons. The first is the strong one. */
  actions?: readonly BlockAction[]
  /** The block's intent, for the highlighted words, the marquee's pause control, and the strong action. */
  intent?: BlockIntent
  /** The surface behind the block. Without one, the photos sit on the page and the marquee runs its full width. */
  emphasis?: BlockEmphasis
  /** Draws the surface inside the page's padding, rounded at every width, instead of as a full-width band. */
  contained?: boolean
  /**
   * Where the heading and actions line up: `start` for `carousel`, beside its controls, and `center` for `marquee` and `wrap`.
   */
  align?: BlockAlign
  /**
   * `md` and `sm` set the title one and two steps smaller, with tighter spacing.
   * @default 'lg'
   */
  size?: BlockSize
}

const ALIGN: Record<GalleryPreset, BlockAlign> = {
  carousel: 'start',
  marquee: 'center',
  wrap: 'center'
}

// Literal class names, so Tailwind finds them. Widths step up with the block's own width.
const CROPPED: Record<
  Exclude<GalleryRatio, 'natural'>,
  { tile: string; sizes: string }
> = {
  portrait: {
    tile: 'aspect-9/16 w-35 @xl:w-45 @4xl:w-55',
    sizes: '(max-width: 640px) 140px, (max-width: 960px) 180px, 220px'
  },
  square: {
    tile: 'aspect-square w-40 @xl:w-50 @4xl:w-60',
    sizes: '(max-width: 640px) 160px, (max-width: 960px) 200px, 240px'
  },
  landscape: {
    tile: 'aspect-4/3 w-56 @xl:w-72 @4xl:w-80',
    sizes: '(max-width: 640px) 224px, (max-width: 960px) 288px, 320px'
  }
}

const NATURAL_HEIGHT = 48

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
  images,
  ratio = 'portrait',
  actions,
  intent,
  emphasis,
  contained,
  align: alignProp,
  size
}: GalleryProps) {
  const headingId = useId()
  const { name, variant } = presetOf(galleryDefinition, presetName)
  const align = alignProp ?? ALIGN[name]
  const gap = bySize(size, { sm: 'gap-6', md: 'gap-8', lg: 'gap-12' })

  const heading = (
    <BlockHeading
      id={headingId}
      eyebrow={eyebrow}
      title={title}
      titleHighlight={titleHighlight}
      description={description}
      align={align}
      size={size}
      intent={intent}
    />
  )
  const tiles = images.map((image, index) => ({
    key: `${index}-${image.src}`,
    tile: <Tile image={image} ratio={ratio} />
  }))
  const blockActions = (
    <BlockActions
      actions={actions}
      intent={intent}
      className={align === 'center' ? 'justify-center' : undefined}
    />
  )
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
      block={galleryDefinition.name}
      variant={variant}
      preset={name}
      intent={intent}
      position={position}
      id={id}
      // The carousel is the landmark the heading names; naming both repeats it.
      aria-labelledby={name === 'carousel' ? undefined : headingId}
      className={cn('grid grid-cols-1', gap)}
    >
      {name === 'carousel' ? (
        <BlockSurface
          emphasis={emphasis}
          contained={contained}
          className={cn('grid min-w-0 grid-cols-1', gap)}
        >
          <Carousel className='min-w-0'>
            {/* The heading takes the row, and the controls sit at its foot, just above the photos they move. */}
            <Carousel.Header className='md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end'>
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
          {blockActions}
        </BlockSurface>
      ) : name === 'wrap' ? (
        <BlockSurface
          emphasis={emphasis}
          contained={contained}
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
          emphasis={emphasis}
          contained={contained}
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
    <div
      className='relative grid grid-cols-1'
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={leave}
    >
      <Marquee speed={MARQUEE_SPEED} paused={stopped || hovered || focused}>
        {children}
      </Marquee>
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
function Tile({ image, ratio }: { image: GalleryImage; ratio: GalleryRatio }) {
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
