import { type ReactNode, useId } from 'react'

import { Highlight } from '@oztix/roadie-components/highlight'
import {
  HighFive,
  NoteMusic,
  Ticket
} from '@oztix/roadie-components/spot-illustrations'

import type { BlockAction, BlockImage } from '../Provider'
import { BlockActions } from '../_shared/BlockActions'
import { BlockImg } from '../_shared/BlockImg'
import { BlockRoot } from '../_shared/BlockRoot'
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

const ILLUSTRATIONS = { HighFive, NoteMusic, Ticket }

export type HeroIllustration = keyof typeof ILLUSTRATIONS

export type HeroProps = {
  /**
   * `page-hero` sets the title over a photo beside a video and cycling photos;
   * `page-header` is an eyebrow and a large title alone.
   * @default 'page-hero'
   */
  preset?: HeroPreset
  /** The block's place on the page, counting from 1. */
  position?: number
  /** The section's anchor, such as `top`. */
  id?: string
  /** A short line above the title, in `page-header`. */
  eyebrow?: string
  /** The page's `h1`. */
  title: string
  /** Words in the title to mark, such as `Australia’s`. */
  titleHighlight?: string | string[]
  /** A sentence under the title that says what the page offers. */
  description?: string
  /** Links under the title. The first is the strong one. */
  actions?: readonly BlockAction[]
  /** The photo behind the title in `page-hero`. Decorative, so its `alt` can be empty. */
  backgroundImage?: BlockImage
  /** The clip beside the title in `page-hero`. */
  video?: HeroVideoSource
  /** Photos of people that cycle in `page-hero`, from a desktop width. */
  peopleImages?: readonly BlockImage[]
  /** Photos of events that cycle in `page-hero`, from a tablet width. */
  eventImages?: readonly BlockImage[]
  /**
   * The spot illustration after the title in `page-hero`.
   * @default 'HighFive'
   */
  illustration?: HeroIllustration
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
      {name === 'page-header' ? (
        <PageHeader headingId={headingId} {...content} />
      ) : (
        <PageHero headingId={headingId} {...content} />
      )}
    </BlockRoot>
  )
}

type PresetProps = Omit<HeroProps, 'preset' | 'position' | 'id'> & {
  headingId: string
}

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
        <Highlight text={title} query={titleHighlight} />
      ) : (
        title
      )}
      {children}
    </h1>
  )
}

function PageHeader({
  headingId,
  eyebrow,
  title,
  titleHighlight,
  description,
  actions
}: PresetProps) {
  return (
    <div className='container-8xl'>
      <div className='grid max-w-5xl justify-items-start gap-4'>
        {eyebrow && (
          <p className='text-display-prose-5 text-strong'>{eyebrow}</p>
        )}
        <Title
          headingId={headingId}
          title={title}
          titleHighlight={titleHighlight}
          className='text-display-prose-2 text-balance text-strong'
        />
        {description && (
          <p className='text-xl text-balance text-subtle'>{description}</p>
        )}
        <BlockActions actions={actions} />
      </div>
    </div>
  )
}

const PANEL = 'relative overflow-clip rounded-3xl bg-subtle'

function PageHero({
  headingId,
  title,
  titleHighlight,
  description,
  actions,
  backgroundImage,
  video,
  peopleImages = [],
  eventImages = [],
  illustration = 'HighFive'
}: PresetProps) {
  const Illustration = ILLUSTRATIONS[illustration]
  return (
    <div className='container-8xl'>
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
          <div className='relative grid gap-8 emphasis-overlay px-6 py-8 intent-brand @3xl:px-8 @3xl:py-10 @5xl:px-10 @5xl:py-12'>
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
        {peopleImages.length > 0 && (
          <div
            data-slot='hero-people'
            className={`${PANEL} hidden @5xl:col-span-3 @5xl:block`}
          >
            <ImageCycler
              images={peopleImages}
              interval={4000}
              sizes='(min-width: 1024px) 25vw, 0px'
            />
          </div>
        )}
        {eventImages.length > 0 && (
          <div
            data-slot='hero-events'
            className={`${PANEL} hidden @3xl:col-span-4 @3xl:block`}
          >
            <ImageCycler
              images={eventImages}
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
