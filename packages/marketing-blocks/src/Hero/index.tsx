import { type ReactNode, useId } from 'react'

import { Highlight } from '@oztix/roadie-components/highlight'
import { Logo } from '@oztix/roadie-components/logo'
import { Prose } from '@oztix/roadie-components/prose'
import { Heart } from '@oztix/roadie-components/spot-illustrations'
import { cn } from '@oztix/roadie-core/utils'

import type { BlockAction, BlockImage } from '../Provider'
import { BlockActions } from '../_shared/BlockActions'
import { BlockHeading } from '../_shared/BlockHeading'
import { BlockImg } from '../_shared/BlockImg'
import { BlockRoot } from '../_shared/BlockRoot'
import { BlockSurface } from '../_shared/BlockSurface'
import {
  SPOT_ILLUSTRATIONS,
  type SpotIllustrationName
} from '../_shared/illustrations'
import { presetOf } from '../_shared/presets'
import {
  type BlockAlign,
  type BlockIntent,
  type BlockSize,
  bySize
} from '../_shared/surface'
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
  titleHighlight?: string | string[]
  /** A sentence under the title that says what the page offers. */
  description?: string
  /** Rich text under the heading in `partner`, already rendered, such as from Portable Text. The block sets it in `Prose`. */
  body?: ReactNode
  /** Links under the title. The first is the strong one. */
  actions?: readonly BlockAction[]
  /** The one photo: behind the title in `bento`, where it's decorative so its `alt` can be empty, or beside it in `image`, at its own shape. */
  image?: BlockImage
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
   * `md` and `sm` set the title one and two steps smaller, with tighter spacing.
   * @default 'lg'
   */
  size?: BlockSize
}

/** Opens a page with its title as the page's `h1`. */
export function Hero({ preset, position, id, ...content }: HeroProps) {
  const headingId = useId()
  const { name, variant } = presetOf(heroDefinition, preset)
  return (
    <BlockRoot
      block={heroDefinition.name}
      intent={content.intent}
      variant={variant}
      preset={name}
      position={position}
      id={id}
      aria-labelledby={headingId}
    >
      {name === 'title' ? (
        <TitleOnly headingId={headingId} {...content} />
      ) : name === 'partner' ? (
        <PartnerHero headingId={headingId} {...content} />
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
  children,
  intent
}: Pick<PresetProps, 'headingId' | 'title' | 'titleHighlight' | 'intent'> & {
  className: string
  children?: ReactNode
}) {
  return (
    <h1 id={headingId} className={className}>
      {titleHighlight ? (
        <Highlight
          text={title}
          query={titleHighlight}
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
const ALIGN_ACTIONS: Record<BlockAlign, string | undefined> = {
  start: undefined,
  center: 'justify-center'
}

function TitleOnly({
  headingId,
  intent,
  eyebrow,
  title,
  titleHighlight,
  description,
  actions,
  align = 'start',
  size
}: PresetProps) {
  return (
    <BlockSurface
      className={cn(
        'grid *:min-w-0',
        ALIGN_ITEMS[align],
        bySize(size, { sm: 'gap-3', md: 'gap-4', lg: 'gap-6' })
      )}
    >
      <BlockHeading
        id={headingId}
        intent={intent}
        level={1}
        step={2}
        size={size}
        align={align}
        eyebrow={eyebrow}
        title={title}
        titleHighlight={titleHighlight}
        description={description}
      />
      <BlockActions
        actions={actions}
        intent={intent}
        className={ALIGN_ACTIONS[align]}
      />
    </BlockSurface>
  )
}

function PartnerHero({
  headingId,
  intent,
  eyebrow,
  title,
  titleHighlight,
  description,
  body,
  actions,
  partner,
  align = 'start',
  size
}: PresetProps) {
  return (
    <BlockSurface
      className={cn(
        'grid grid-cols-1 gap-8 @xl:gap-16 @5xl:gap-24',
        partner && '@xl:grid-cols-[auto_minmax(0,1fr)] @3xl:grid-cols-2'
      )}
    >
      {partner && <PartnerLockup {...partner} />}
      <div
        className={cn(
          'grid min-w-0 grid-cols-1 content-start wrap-break-word',
          bySize(size, { sm: 'gap-4', md: 'gap-6', lg: 'gap-8' })
        )}
      >
        <BlockHeading
          id={headingId}
          level={1}
          step={2}
          size={size}
          align={align}
          intent={intent}
          eyebrow={eyebrow}
          title={title}
          titleHighlight={titleHighlight}
          description={description}
        />
        {body && (
          <Prose
            size='md'
            className={align === 'center' ? 'text-center' : undefined}
          >
            {body}
          </Prose>
        )}
        <BlockActions
          actions={actions}
          intent={intent}
          className={ALIGN_ACTIONS[align]}
        />
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

function ImageHero({
  headingId,
  intent,
  eyebrow,
  title,
  titleHighlight,
  description,
  actions,
  image,
  align = 'start',
  size
}: PresetProps) {
  return (
    <BlockSurface
      className={cn(
        'grid gap-8 *:min-w-0 @xl:grid-cols-2 @xl:items-center @4xl:grid-cols-5',
        bySize(size, { sm: '@4xl:gap-8', md: '@4xl:gap-12', lg: '@4xl:gap-16' })
      )}
    >
      <div
        className={cn(
          'grid @4xl:col-span-2',
          ALIGN_ITEMS[align],
          bySize(size, { sm: 'gap-3', md: 'gap-4', lg: 'gap-6' })
        )}
      >
        <BlockHeading
          id={headingId}
          intent={intent}
          level={1}
          size={size}
          align={align}
          eyebrow={eyebrow}
          title={title}
          titleHighlight={titleHighlight}
          description={description}
        />
        <BlockActions
          actions={actions}
          intent={intent}
          className={ALIGN_ACTIONS[align]}
        />
      </div>
      {image && (
        <div className='order-first overflow-clip rounded-xl @xl:order-last @4xl:col-span-3'>
          <BlockImg
            image={image}
            sizes='(min-width: 960px) 60vw, (min-width: 640px) 50vw, 100vw'
            priority
            className='h-auto w-full'
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
  headingId,
  intent,
  title,
  titleHighlight,
  description,
  actions,
  image,
  video,
  images = [],
  illustration = 'HighFive',
  align = 'start',
  size
}: PresetProps) {
  const Illustration = SPOT_ILLUSTRATIONS[illustration]
  const [primaryImages, secondaryImages] = bentoPanels(images)
  const hasPrimary = primaryImages.length > 0
  const hasSecondary = secondaryImages.length > 0
  const moves =
    video != null || primaryImages.length > 1 || secondaryImages.length > 1
  return (
    <HeroMotionProvider>
      <div className='mx-auto w-full max-w-8xl px-4 @xl:px-6 @7xl:px-2'>
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
                'relative grid gap-8 px-6 py-8 text-(--color-neutral-light-0) @xl:px-8 @xl:py-10 @4xl:px-10 @4xl:py-12',
                align === 'center' && 'justify-items-center text-center',
                SCRIM[intent ?? 'brand']
              )}
            >
              <div className='grid content-center gap-2'>
                <Title
                  headingId={headingId}
                  title={title}
                  titleHighlight={titleHighlight}
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
                  <p className='text-lg font-medium text-balance'>
                    {description}
                  </p>
                )}
              </div>
              <BlockActions
                actions={actions}
                intent={intent}
                fill='scrim'
                className={cn('gap-2', ALIGN_ACTIONS[align])}
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
                video ? '@xl:col-span-4' : '@xl:col-span-9 @xl:aspect-21/9'
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
            <HeroMotionToggle className='absolute end-3 bottom-3 @xl:end-4 @xl:bottom-4' />
          )}
        </div>
      </div>
    </HeroMotionProvider>
  )
}
