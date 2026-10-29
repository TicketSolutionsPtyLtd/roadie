import { type ReactNode, useId } from 'react'

import { Logo } from '@oztix/roadie-components/logo'
import { Prose } from '@oztix/roadie-components/prose'
import { Heart } from '@oztix/roadie-components/spot-illustrations'
import { cn } from '@oztix/roadie-core/utils'

import type { BlockAction, BlockImage } from '../Provider'
import { BlockActions } from '../_shared/BlockActions'
import { BlockHeading, type BlockHeadingProps } from '../_shared/BlockHeading'
import { BlockImg } from '../_shared/BlockImg'
import { BlockRoot } from '../_shared/BlockRoot'
import { type StatItem, StatList } from '../_shared/StatList'
import { presetOf } from '../_shared/presets'
import { type SplitPreset, splitDefinition } from './definition'

export type { StatItem } from '../_shared/StatList'
export type { SplitPreset } from './definition'

/** The partner a `logo-lockup` features. */
export type SplitPartner = {
  /** The partner's name, which names the logo when it has no alt text. */
  name: string
  logo: BlockImage
}

/** The stats beside a `text-and-stats` split. */
export type SplitStats = {
  /** The aside's heading, such as `By the numbers`. */
  title: string
  /** A sentence under the aside's heading. */
  description?: string
  /** The stats, each a value as written, its label, and an optional spot illustration. */
  items: readonly StatItem[]
}

export type SplitProps = {
  /**
   * The named look. `tinted-panel` sets an image beside the heading on a tinted panel, `media-text` sets a plain image beside the heading, body, and actions, `text-and-stats` sets long-form text beside `stats`, and `logo-lockup` opens a partner page with the Oztix logo and the `partner` logo joined by a heart, its title as the page's `h1`.
   * @default 'tinted-panel'
   */
  preset?: SplitPreset
  /** The block's place on the page, counting from 1, reported with its events. */
  position?: number
  /** An id for linking to the block. */
  id?: string
  /** A short line above the title. */
  eyebrow?: string
  /** The section's heading. */
  title: string
  /** Words in the title to mark, such as `partnerships`. */
  titleHighlight?: string | string[]
  /** A sentence under the title. */
  description?: string
  /** Rich text under the heading, already rendered, such as from Portable Text. The block sets it in `Prose`. */
  body?: ReactNode
  /** Links under the text, as buttons. The first is the strong one. */
  actions?: readonly BlockAction[]
  /** The `tinted-panel` or `media-text` image, shown before the text. */
  image?: BlockImage
  /** The partner in a `logo-lockup`, whose logo sits under the Oztix logo. */
  partner?: SplitPartner
  /** The `text-and-stats` aside, which wraps below the text on narrow widths. */
  stats?: SplitStats
}

const CONTENT: Record<
  SplitPreset,
  {
    level: BlockHeadingProps['level']
    size: BlockHeadingProps['size']
    gap: string
    prose: 'md' | 'lg'
    proseClassName?: string
    contentClassName?: string
  }
> = {
  'tinted-panel': {
    level: 2,
    size: 3,
    gap: 'gap-4',
    prose: 'md',
    proseClassName: 'text-subtle',
    // The panel's tint is info, but its text reads as neutral, as on the live site.
    contentClassName: 'intent-neutral [&_h2]:intent-info'
  },
  'media-text': { level: 2, size: 2, gap: 'gap-6', prose: 'md' },
  'text-and-stats': {
    level: 2,
    size: 2,
    gap: 'gap-6',
    prose: 'lg',
    proseClassName: 'max-w-[60ch] [&>h3]:text-display-prose-5'
  },
  'logo-lockup': { level: 1, size: 2, gap: 'gap-8', prose: 'md' }
}

/** Text beside an image, a partner lockup, or the numbers that back it up. */
export function Split({
  preset,
  position,
  id,
  eyebrow,
  title,
  titleHighlight,
  description,
  body,
  actions,
  image,
  partner,
  stats
}: SplitProps) {
  const { name, variant } = presetOf(splitDefinition, preset)
  const layout = CONTENT[name]
  const headingId = useId()

  const content = (
    <div
      className={cn(
        'grid min-w-0 grid-cols-1 content-start wrap-break-word',
        layout.gap,
        layout.contentClassName
      )}
    >
      <BlockHeading
        id={headingId}
        level={layout.level}
        size={layout.size}
        align='start'
        eyebrow={eyebrow}
        title={title}
        titleHighlight={titleHighlight}
        description={description}
      />
      {body && (
        <Prose size={layout.prose} className={layout.proseClassName}>
          {body}
        </Prose>
      )}
      <BlockActions actions={actions} />
    </div>
  )

  return (
    <BlockRoot
      block={splitDefinition.name}
      variant={variant}
      preset={name}
      position={position}
      id={id}
      aria-labelledby={headingId}
    >
      {name === 'text-and-stats' && (
        <div
          className={cn(
            'container-8xl grid grid-cols-1 gap-12 @5xl:gap-x-24',
            stats && '@3xl:grid-cols-[minmax(0,1fr)_20rem]'
          )}
        >
          {content}
          {stats && <StatsAside {...stats} />}
        </div>
      )}
      {name === 'logo-lockup' && (
        <div
          className={cn(
            'container-8xl grid grid-cols-1 gap-8 @xl:gap-16 @5xl:gap-24',
            partner && '@xl:grid-cols-[auto_minmax(0,1fr)] @3xl:grid-cols-2'
          )}
        >
          {partner && <PartnerLockup {...partner} />}
          {content}
        </div>
      )}
      {name === 'media-text' && (
        <div
          className={cn(
            'container-8xl grid grid-cols-1 items-center gap-8 @5xl:gap-16',
            image && '@xl:grid-cols-2'
          )}
        >
          {image && (
            <div className='aspect-4/3 min-w-0 overflow-hidden rounded-2xl'>
              <BlockImg
                image={image}
                sizes='(min-width: 40rem) 50vw, 100vw'
                className='size-full object-cover'
              />
            </div>
          )}
          {content}
        </div>
      )}
      {name === 'tinted-panel' && (
        <div className='container-8xl'>
          <div
            className={cn(
              'grid grid-cols-1 items-center gap-6 rounded-2xl emphasis-subtle p-6 intent-info @3xl:gap-12',
              image && '@xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]'
            )}
          >
            {image && (
              <div className='aspect-8/5 min-w-0 overflow-hidden rounded-xl'>
                <BlockImg
                  image={image}
                  sizes='(min-width: 40rem) 40vw, 100vw'
                  className='size-full object-cover'
                />
              </div>
            )}
            {content}
          </div>
        </div>
      )}
    </BlockRoot>
  )
}

function StatsAside({ title, description, items }: SplitStats) {
  return (
    <div className='grid min-w-0 content-start gap-4'>
      <div className='grid gap-0.5'>
        <h3 className='text-display-prose-4 text-strong'>{title}</h3>
        {description && <p className='text-subtle'>{description}</p>}
      </div>
      <StatList items={items} />
    </div>
  )
}

// The logos sit the same height either side of a short middle row, so the heart, centred across all three, overlaps both.
function PartnerLockup({ name, logo }: SplitPartner) {
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
