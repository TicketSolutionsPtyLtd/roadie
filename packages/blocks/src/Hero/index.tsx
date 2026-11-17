import type { ReactNode } from 'react'

import { Highlight } from '@oztix/roadie-components/highlight'
import { Logo } from '@oztix/roadie-components/logo'
import { Prose } from '@oztix/roadie-components/prose'
import { cn } from '@oztix/roadie-core/utils'
import { Heart } from '@oztix/roadie-illustrations/spot'

import type { BlockAction, BlockImage } from '../Provider'
import { BlockActions } from '../_shared/BlockActions'
import { BlockHeading } from '../_shared/BlockHeading'
import { BlockImg } from '../_shared/BlockImg'
import { BlockRoot } from '../_shared/BlockRoot'
import { BlockSurface, FRAME_EDGE } from '../_shared/BlockSurface'
import { cleanHighlight } from '../_shared/highlight'
import {
  type SpotIllustrationName,
  spotIllustration
} from '../_shared/illustrations'
import { presetOf } from '../_shared/presets'
import {
  type BlockAlign,
  type BlockIntent,
  type BlockRatio,
  type BlockSize,
  bySize,
  gapOf,
  ratioClass
} from '../_shared/surface'
import { type BlockFrame, useBlock } from '../_shared/useBlock'
import { HeroMotionProvider, HeroMotionToggle } from './HeroMotion'
import { HeroVideo } from './HeroVideo'
import { ImageCycler } from './ImageCycler'
import { type HeroPreset, heroDefinition } from './definition'

export type { HeroPreset } from './definition'

export type HeroVideoSource = {
  /** The clip, tried first. With a `fallbackSrc`, an AV1 MP4. */
  src: string
  /** An H.264 MP4 for browsers that can't play AV1. */
  fallbackSrc?: string
  /** Shown until the clip plays, and for viewers who reduce motion. Its `alt` names the video. */
  poster: BlockImage
}

/** The partner a `partner` hero features. */
export type HeroPartner = {
  /** The partner's name, which names the logo when it has no alt text. */
  name: string
  logo: BlockImage
}

export type HeroProps = {
  /**
   * `bento` sets the title over a photo beside a video and cycling photos;
   * `image` sets it beside one photo; `title` is an eyebrow and a large title
   * alone; `partner` sets it beside the Oztix and `partner` logos joined by a
   * heart.
   * @default 'bento'
   */
  preset?: HeroPreset
  /** The block's place on the page, counting from 1, reported with its events. */
  position?: number
  /** An id for linking to the block. */
  id?: string
  /** A short line above the title, in `image`, `title`, and `partner`. */
  eyebrow?: string
  /** The page's `h1`. */
  title: string
  /** Words in the title to mark, such as `Australia’s`. */
  highlight?: string | string[]
  /** A sentence under the title that says what the page offers. */
  description?: string
  /** Rich text under the heading in `partner`, already rendered, such as from Portable Text. The block sets it in `Prose`. */
  body?: ReactNode
  /** Links under the title. The first is the strong one. */
  actions?: readonly BlockAction[]
  /** The one photo: behind the title in `bento`, where it's decorative so its `alt` can be empty, or beside it in `image`, cropped to its `ratio`. */
  image?: BlockImage
  /**
   * The photo's shape in `image`: `story` (9:16), `portrait` (3:4), `square`, `landscape` (3:2), or `banner` (2:1).
   * @default 'banner'
   */
  ratio?: BlockRatio
  /** The clip beside the title in `bento`. */
  video?: HeroVideoSource
  /**
   * Photos that cycle in `bento`'s two panels, filling them in order: the
   * first half, up to six, beside the title, shown once the block is about 56rem wide,
   * and the rest beside the video, shown from about 36rem.
   */
  images?: readonly BlockImage[]
  /**
   * The spot illustration after the title in `bento`.
   * @default 'HighFive'
   */
  illustration?: SpotIllustrationName
  /** The partner in `partner`, whose logo sits under the Oztix logo. */
  partner?: HeroPartner
  /**
   * The hero's intent: its highlighted words, its strong action, and the
   * bento's photo tint take it. Without one, the highlight is brand-secondary,
   * the action accent, and the tint brand.
   */
  intent?: BlockIntent
  /**
   * Where the title and text line up.
   * @default 'start'
   */
  align?: BlockAlign
  /**
   * `md` and `sm` set the title one and two steps smaller, with smaller text
   * and tighter spacing. In `image`, they also give the photo a half and two
   * fifths of the width, down from three fifths.
   * @default 'lg'
   */
  size?: BlockSize
}

/** Opens a page with its title as the page's `h1`. */
export function Hero(props: HeroProps) {
  const block = useBlock(heroDefinition, props)
  return (
    <BlockRoot {...block.root}>
      {block.name === 'title' ? (
        <TitleOnly {...props} block={block} />
      ) : block.name === 'partner' ? (
        <PartnerHero {...props} block={block} />
      ) : block.name === 'image' ? (
        <ImageHero {...props} block={block} />
      ) : (
        <Bento {...props} block={block} />
      )}
    </BlockRoot>
  )
}

type PresetProps = HeroProps & { block: BlockFrame }

// Not BlockHeading: this title sits on the fixed-dark overlay in fixed light
// text, with the illustration inline in the h1.
function Title({
  headingId,
  title,
  highlight,
  className,
  children,
  intent
}: Pick<PresetProps, 'title' | 'highlight' | 'intent'> & {
  headingId: string
  className: string
  children?: ReactNode
}) {
  return (
    <h1 id={headingId} className={className}>
      {highlight ? (
        <Highlight
          text={title}
          query={cleanHighlight(highlight)}
          intent={intent ?? 'brand-secondary'}
        />
      ) : (
        title
      )}
      {children}
    </h1>
  )
}

const ALIGN_ITEMS: Record<BlockAlign, string> = {
  start: 'justify-items-start',
  center: 'justify-items-center'
}

function TitleOnly({ block, size }: PresetProps) {
  return (
    <BlockSurface
      className={cn(
        'grid *:min-w-0',
        ALIGN_ITEMS[block.align],
        gapOf(size, 'snug')
      )}
    >
      <BlockHeading {...block.heading} level={1} step={2} />
      <BlockActions {...block.actions} />
    </BlockSurface>
  )
}

function PartnerHero({ block, body, partner, size }: PresetProps) {
  return (
    <BlockSurface
      className={cn(
        'grid grid-cols-1',
        bySize(size, {
          sm: 'gap-4 @xl:gap-8 @5xl:gap-12',
          md: 'gap-6 @xl:gap-12 @5xl:gap-16',
          lg: 'gap-8 @xl:gap-16 @5xl:gap-24'
        }),
        partner && '@xl:grid-cols-[auto_minmax(0,1fr)] @3xl:grid-cols-2'
      )}
    >
      {partner && <PartnerLockup {...partner} />}
      <div
        className={cn(
          'grid min-w-0 grid-cols-1 content-start wrap-break-word',
          gapOf(size, 'normal')
        )}
      >
        <BlockHeading {...block.heading} level={1} step={2} />
        {body && (
          <Prose
            size={bySize(size, { sm: 'sm', md: 'md', lg: 'md' })}
            className={block.align === 'center' ? 'text-center' : undefined}
          >
            {body}
          </Prose>
        )}
        <BlockActions {...block.actions} />
      </div>
    </BlockSurface>
  )
}

// The logos sit the same height either side of a short middle row, so the heart, centred across all three, overlaps both.
function PartnerLockup({ name, logo }: HeroPartner) {
  return (
    <div className='grid grid-rows-[auto_1.5rem_auto] content-start justify-items-center justify-self-center'>
      {/* Logo's largest size is 48px; the live lockup sets both logos at 60px. */}
      <Logo className='col-start-1 row-start-1 text-[3.75rem]' />
      <BlockImg
        image={{ ...logo, alt: logo.alt || name }}
        sizes='16rem'
        className='col-start-1 row-start-3 h-15 w-auto'
      />
      <Heart
        outline
        className='col-start-1 row-span-full size-16 self-center'
      />
    </div>
  )
}

const IMAGE_SHARE: Record<BlockSize, { text: string; photo: string }> = {
  sm: { text: '@4xl:col-span-6', photo: '@4xl:col-span-4' },
  md: { text: '@4xl:col-span-5', photo: '@4xl:col-span-5' },
  lg: { text: '@4xl:col-span-4', photo: '@4xl:col-span-6' }
}

function ImageHero({ block, image, ratio, size = 'lg' }: PresetProps) {
  const share = bySize(size, IMAGE_SHARE)
  const preset = presetOf(heroDefinition, block.name)
  const shape =
    ratio ?? ('ratio' in preset.defaults ? preset.defaults.ratio : 'banner')
  return (
    <BlockSurface
      className={cn(
        'grid *:min-w-0 @xl:grid-cols-2 @xl:items-center @4xl:grid-cols-10',
        bySize(size, {
          sm: 'gap-4 @4xl:gap-8',
          md: 'gap-6 @4xl:gap-12',
          lg: 'gap-8 @4xl:gap-16'
        })
      )}
    >
      <div
        className={cn(
          'grid',
          share.text,
          ALIGN_ITEMS[block.align],
          gapOf(size, 'snug')
        )}
      >
        <BlockHeading {...block.heading} level={1} />
        <BlockActions {...block.actions} />
      </div>
      {image && (
        <div
          className={cn(
            'order-first overflow-clip rounded-xl @xl:order-last',
            ratioClass[shape],
            share.photo
          )}
        >
          <BlockImg
            image={image}
            sizes='(min-width: 960px) 60vw, (min-width: 640px) 50vw, 100vw'
            priority
            className='size-full object-cover'
          />
        </div>
      )}
    </BlockSurface>
  )
}

// Each intent's fixed dark step, so the tint is the same in both themes.
// Literal classes, so Tailwind finds them.
const SCRIM: Record<BlockIntent, string> = {
  neutral: 'bg-(--color-neutral-light-13)/65',
  brand: 'bg-(--color-brand-light-13)/65',
  'brand-secondary': 'bg-(--color-brand-secondary-light-13)/65',
  'brand-purple': 'bg-(--color-brand-purple-light-13)/65',
  accent: 'bg-(--color-accent-light-13)/65',
  info: 'bg-(--color-info-light-13)/65',
  success: 'bg-(--color-success-light-13)/65',
  warning: 'bg-(--color-warning-light-13)/65',
  danger: 'bg-(--color-danger-light-13)/65'
}

// Fixed white frames and a fixed dark scrim, as the photos sit the same in
// both themes. 65% keeps body text at APCA Lc 75, and the accent action
// distinct from the tint, over even a white photo.
const PANEL =
  'relative overflow-clip rounded-3xl border-4 border-(--color-neutral-light-0) bg-subtle @xl:border-6 @4xl:border-8'

// The title's panel is the smaller, so it takes half the photos, up to six.
const TITLE_PANEL_PHOTOS = 6

function bentoPanels(images: readonly BlockImage[]) {
  const half = Math.min(Math.ceil(images.length / 2), TITLE_PANEL_PHOTOS)
  return [images.slice(0, half), images.slice(half)] as const
}

function Bento({
  block,
  intent,
  title,
  highlight,
  description,
  image,
  video,
  images = [],
  illustration = 'HighFive',
  size
}: PresetProps) {
  const { align } = block
  const Illustration = spotIllustration(illustration, 'HighFive')
  const [primaryImages, secondaryImages] = bentoPanels(images)
  const hasPrimary = primaryImages.length > 0
  const hasSecondary = secondaryImages.length > 0
  const moves =
    video != null || primaryImages.length > 1 || secondaryImages.length > 1
  // The photo panels are hidden on narrow blocks, so their cycling alone shows no control there.
  const toggleHidden =
    video == null &&
    (secondaryImages.length > 1 ? 'hidden @xl:block' : 'hidden @4xl:block')
  return (
    <HeroMotionProvider>
      <div className={cn('mx-auto w-full max-w-8xl', FRAME_EDGE)}>
        <div className='relative grid grid-cols-1 gap-4 *:min-w-0 @xl:grid-cols-9 @xl:gap-2.5 @4xl:gap-3 @7xl:gap-4'>
          <div
            data-slot='hero-heading'
            className={cn(
              PANEL,
              'grid @xl:col-span-9',
              hasPrimary && '@4xl:col-span-6'
            )}
          >
            {image && (
              <BlockImg
                image={{ ...image, alt: '' }}
                sizes={hasPrimary ? '(min-width: 1024px) 66vw, 100vw' : '100vw'}
                priority
                className='absolute inset-0 size-full object-cover'
              />
            )}
            <div
              data-slot='hero-scrim'
              className={cn(
                'relative grid px-5 py-8 text-(--color-neutral-light-0) @md:px-6 @xl:px-8 @xl:py-10 @4xl:px-10 @4xl:py-12',
                gapOf(size, 'normal'),
                align === 'center' && 'justify-items-center text-center',
                SCRIM[intent ?? 'brand']
              )}
            >
              <div className='grid content-center gap-2'>
                <Title
                  headingId={block.heading.id}
                  title={title}
                  highlight={highlight}
                  intent={intent}
                  className={cn(
                    'text-balance',
                    bySize(size, {
                      sm: 'text-display-prose-3',
                      md: 'text-display-prose-2',
                      lg: 'text-display-prose-1'
                    })
                  )}
                >
                  {' '}
                  <Illustration
                    outline
                    className='inline-block size-12 align-middle @xl:size-16 @4xl:size-20'
                  />
                </Title>
                {description && (
                  <p
                    className={cn(
                      'font-medium text-balance',
                      bySize(size, {
                        sm: 'text-sm',
                        md: 'text-base',
                        lg: 'text-lg'
                      })
                    )}
                  >
                    {description}
                  </p>
                )}
              </div>
              {/* A narrow phone sets text wider on some platforms, so the panel and its buttons give a little of their padding to keep two actions on one row. */}
              <BlockActions
                {...block.actions}
                fill='scrim'
                className='gap-2 @max-md:*:px-3'
              />
            </div>
          </div>
          {hasPrimary && (
            <div
              data-slot='hero-primary'
              className={`${PANEL} hidden @4xl:col-span-3 @4xl:block`}
            >
              <ImageCycler
                images={primaryImages}
                interval={4000}
                sizes='33vw'
              />
            </div>
          )}
          {hasSecondary && (
            <div
              data-slot='hero-secondary'
              className={cn(
                PANEL,
                'hidden @xl:block',
                video ? '@xl:col-span-4' : '@xl:col-span-9',
                !video && ratioClass.banner
              )}
            >
              <ImageCycler
                images={secondaryImages}
                interval={5000}
                sizes={video ? '45vw' : '100vw'}
              />
            </div>
          )}
          {video && (
            <div
              data-slot='hero-video'
              className={cn(
                PANEL,
                'aspect-video',
                hasSecondary ? '@xl:col-span-5' : '@xl:col-span-9'
              )}
            >
              <HeroVideo
                {...video}
                sizes={
                  hasSecondary ? '(min-width: 576px) 55vw, 100vw' : '100vw'
                }
              />
            </div>
          )}
          {moves && (
            <div
              className={cn(
                'absolute end-3 bottom-3 @xl:end-4 @xl:bottom-4',
                toggleHidden
              )}
            >
              <HeroMotionToggle />
            </div>
          )}
        </div>
      </div>
    </HeroMotionProvider>
  )
}
