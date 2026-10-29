import { type ReactNode, useId } from 'react'

import { Highlight } from '@oztix/roadie-components/highlight'

import type { BlockAction, BlockImage } from '../Provider'
import { BlockActions } from '../_shared/BlockActions'
import { BlockHeading } from '../_shared/BlockHeading'
import { BlockImg } from '../_shared/BlockImg'
import { BlockRoot } from '../_shared/BlockRoot'
import {
  SPOT_ILLUSTRATIONS,
  type SpotIllustrationName
} from '../_shared/illustrations'
import { presetOf } from '../_shared/presets'
import { HeroVideo } from './HeroVideo'
import { ImageCycler } from './ImageCycler'
import { heroDefinition } from './definition'

export type HeroPreset = (typeof heroDefinition.presets)[number]['name']

export type HeroVideoSource = {
  /** The clip, tried first. With a `fallbackSrc`, an AV1 MP4. */
  src: string
  /** An H.264 MP4 for browsers that can't play AV1. */
  fallbackSrc?: string
  /** Shown until the clip plays, and for viewers who reduce motion. Its `alt` names the video. */
  poster: BlockImage
}

export type HeroProps = {
  /**
   * `bento` sets the title over a photo beside a video and cycling photos;
   * `image` sets it beside one photo; `title` is an eyebrow and a large title
   * alone.
   * @default 'bento'
   */
  preset?: HeroPreset
  /** The block's place on the page, counting from 1, reported with its events. */
  position?: number
  /** An id for linking to the block. */
  id?: string
  /** A short line above the title, in `title`. */
  eyebrow?: string
  /** The page's `h1`. */
  title: string
  /** Words in the title to mark, such as `Australia’s`. */
  titleHighlight?: string | string[]
  /** A sentence under the title that says what the page offers. */
  description?: string
  /** Links under the title. The first is the strong one. */
  actions?: readonly BlockAction[]
  /** The photo beside the title in `image`, at its own shape. */
  image?: BlockImage
  /** The photo behind the title in `bento`. Decorative, so its `alt` can be empty. */
  backgroundImage?: BlockImage
  /** The clip beside the title in `bento`. */
  video?: HeroVideoSource
  /** Photos that cycle in `bento`'s panel beside the title, shown from a desktop width. */
  primaryImages?: readonly BlockImage[]
  /** Photos that cycle in `bento`'s lower panel beside the video, shown from a tablet width. */
  secondaryImages?: readonly BlockImage[]
  /**
   * The spot illustration after the title in `bento`.
   * @default 'HighFive'
   */
  illustration?: SpotIllustrationName
}

/** Opens a page with its title as the page's `h1`. */
export function Hero({ preset, position, id, ...content }: HeroProps) {
  const headingId = useId()
  const { name, variant } = presetOf(heroDefinition, preset)
  return (
    <BlockRoot
      block={heroDefinition.name}
      variant={variant}
      preset={name}
      position={position}
      id={id}
      aria-labelledby={headingId}
    >
      {name === 'title' ? (
        <TitleOnly headingId={headingId} {...content} />
      ) : name === 'image' ? (
        <ImageHero headingId={headingId} {...content} />
      ) : (
        <Bento headingId={headingId} {...content} />
      )}
    </BlockRoot>
  )
}

type PresetProps = Omit<HeroProps, 'preset' | 'position' | 'id'> & {
  headingId: string
}

// Not BlockHeading: this title sits on the fixed-dark overlay in fixed light
// text, with the illustration inline in the h1.
function Title({
  headingId,
  title,
  titleHighlight,
  className,
  children
}: Pick<PresetProps, 'headingId' | 'title' | 'titleHighlight'> & {
  className: string
  children?: ReactNode
}) {
  return (
    <h1 id={headingId} className={className}>
      {titleHighlight ? (
        <Highlight
          text={title}
          query={titleHighlight}
          intent='brand-secondary'
        />
      ) : (
        title
      )}
      {children}
    </h1>
  )
}

function TitleOnly({
  headingId,
  eyebrow,
  title,
  titleHighlight,
  description,
  actions
}: PresetProps) {
  return (
    <div className='container-8xl grid justify-items-start gap-6'>
      <BlockHeading
        id={headingId}
        level={1}
        size={2}
        align='start'
        eyebrow={eyebrow}
        title={title}
        titleHighlight={titleHighlight}
        description={description}
      />
      <BlockActions actions={actions} />
    </div>
  )
}

function ImageHero({
  headingId,
  eyebrow,
  title,
  titleHighlight,
  description,
  actions,
  image
}: PresetProps) {
  return (
    <div className='container-8xl grid gap-8 @5xl:grid-cols-5 @5xl:items-center @5xl:gap-16'>
      <div className='grid justify-items-start gap-6 @5xl:col-span-2'>
        <BlockHeading
          id={headingId}
          level={1}
          align='start'
          eyebrow={eyebrow}
          title={title}
          titleHighlight={titleHighlight}
          description={description}
        />
        <BlockActions actions={actions} />
      </div>
      {image && (
        <div className='order-first overflow-clip rounded-xl @5xl:order-last @5xl:col-span-3'>
          <BlockImg
            image={image}
            sizes='(min-width: 1024px) 60vw, 100vw'
            priority
            className='h-auto w-full'
          />
        </div>
      )}
    </div>
  )
}

// Fixed white frames and a fixed navy scrim, as the photos sit the same in
// both themes. 60% keeps body text at APCA Lc 75 over even a white photo.
const PANEL =
  'relative overflow-clip rounded-3xl border-4 border-(--color-neutral-light-0) bg-subtle @3xl:border-6 @5xl:border-8'

function Bento({
  headingId,
  title,
  titleHighlight,
  description,
  actions,
  backgroundImage,
  video,
  primaryImages = [],
  secondaryImages = [],
  illustration = 'HighFive'
}: PresetProps) {
  const Illustration = SPOT_ILLUSTRATIONS[illustration]
  return (
    <div className='mx-auto w-full max-w-8xl px-4 @3xl:px-6 @7xl:px-2'>
      <div className='grid grid-cols-1 gap-4 @3xl:grid-cols-9 @3xl:gap-2.5 @5xl:gap-3 @7xl:gap-4'>
        <div
          data-slot='hero-heading'
          className={`${PANEL} grid @3xl:col-span-9 @5xl:col-span-6`}
        >
          {backgroundImage && (
            <BlockImg
              image={{ ...backgroundImage, alt: '' }}
              sizes='(min-width: 1024px) 66vw, 100vw'
              priority
              className='absolute inset-0 size-full object-cover'
            />
          )}
          <div
            data-slot='hero-scrim'
            className='relative grid gap-8 bg-(--color-brand-light-13)/60 px-6 py-8 text-(--color-neutral-light-0) @3xl:px-8 @3xl:py-10 @5xl:px-10 @5xl:py-12'
          >
            <div className='grid content-center gap-2'>
              <Title
                headingId={headingId}
                title={title}
                titleHighlight={titleHighlight}
                className='text-display-prose-1 text-balance'
              >
                {' '}
                <Illustration
                  outline
                  className='inline-block size-12 align-middle @3xl:size-16 @5xl:size-20'
                />
              </Title>
              {description && (
                <p className='text-lg font-medium text-balance'>
                  {description}
                </p>
              )}
            </div>
            <BlockActions actions={actions} className='gap-2' />
          </div>
        </div>
        {primaryImages.length > 0 && (
          <div
            data-slot='hero-primary'
            className={`${PANEL} hidden @5xl:col-span-3 @5xl:block`}
          >
            <ImageCycler
              images={primaryImages}
              interval={4000}
              sizes='(min-width: 1024px) 25vw, 0px'
            />
          </div>
        )}
        {secondaryImages.length > 0 && (
          <div
            data-slot='hero-secondary'
            className={`${PANEL} hidden @3xl:col-span-4 @3xl:block`}
          >
            <ImageCycler
              images={secondaryImages}
              interval={5000}
              sizes='(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 0px'
            />
          </div>
        )}
        {video && (
          <div
            data-slot='hero-video'
            className={`${PANEL} aspect-video @3xl:col-span-5`}
          >
            <HeroVideo {...video} />
          </div>
        )}
      </div>
    </div>
  )
}
