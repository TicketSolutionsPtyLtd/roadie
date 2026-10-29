import { type ReactNode, useId } from 'react'

import { Logo } from '@oztix/roadie-components/logo'
import { Prose } from '@oztix/roadie-components/prose'
import { Heart } from '@oztix/roadie-components/spot-illustrations'
import { cn } from '@oztix/roadie-core/utils'

import type { BlockAction, BlockImage } from '../Provider'
import { type StatItem, StatList } from '../Stats/StatList'
import { BlockActions } from '../_shared/BlockActions'
import { BlockHeading, type BlockHeadingProps } from '../_shared/BlockHeading'
import { BlockImg } from '../_shared/BlockImg'
import { BlockRoot } from '../_shared/BlockRoot'
import { presetOf } from '../_shared/presets'
import { splitDefinition } from './definition'

export type { SpotIllustrationName, StatItem } from '../Stats/StatList'

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
   * The named look. `feature-row` sets an image beside the heading on a tinted panel, `text-and-stats` sets long-form text beside `stats`, and `partner-spotlight` opens a partner page with the Oztix logo and `partnerLogo` joined by a heart, its title as the page's `h1`.
   * @default 'feature-row'
   */
  preset?: 'feature-row' | 'text-and-stats' | 'partner-spotlight'
  /** The block's place on the page, counting from 1, reported with its events. */
  position?: number
  /** The section's id, for linking to it as an anchor. */
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
  /** The `feature-row` image, shown before the text. */
  image?: BlockImage
  /** The partner's logo in a `partner-spotlight`, under the Oztix logo. */
  partnerLogo?: BlockImage
  /** The `text-and-stats` aside, which wraps below the text on narrow widths. */
  stats?: SplitStats
}

type Preset = NonNullable<SplitProps['preset']>

const CONTENT: Record<
  Preset,
  {
    level: BlockHeadingProps['level']
    gap: string
    prose: 'md' | 'lg'
    proseClassName?: string
  }
> = {
  'feature-row': { level: 2, gap: 'gap-4', prose: 'md' },
  'text-and-stats': {
    level: 2,
    gap: 'gap-6',
    prose: 'lg',
    proseClassName: 'max-w-[60ch] [&>h3]:text-display-prose-5'
  },
  'partner-spotlight': { level: 1, gap: 'gap-8', prose: 'md' }
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
  partnerLogo,
  stats
}: SplitProps) {
  const { name, variant } = presetOf(splitDefinition, preset)
  const layout = CONTENT[name as Preset]
  const headingId = useId()

  const content = (
    <div className={cn('grid content-start', layout.gap)}>
      <BlockHeading
        id={headingId}
        level={layout.level}
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
        <div className='container-8xl flex flex-wrap gap-x-24 gap-y-12'>
          <div className='grow-999 basis-[60ch]'>{content}</div>
          {stats && <StatsAside {...stats} />}
        </div>
      )}
      {name === 'partner-spotlight' && (
        <div className='container-8xl flex flex-wrap gap-16 @5xl:gap-24'>
          {partnerLogo && <PartnerLockup partnerLogo={partnerLogo} />}
          <div className='grow basis-100'>{content}</div>
        </div>
      )}
      {name === 'feature-row' && (
        <div className='container-8xl'>
          <div className='grid items-center gap-12 rounded-2xl emphasis-subtle p-6 intent-info @3xl:grid-cols-[2fr_3fr]'>
            {image && (
              <BlockImg
                image={image}
                sizes='(min-width: 48rem) 40vw, 100vw'
                className='aspect-8/5 w-full rounded-xl object-cover'
              />
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
    <div className='grid grow basis-80 content-start gap-4'>
      <div className='grid gap-0.5'>
        <h3 className='text-display-prose-4 text-strong'>{title}</h3>
        {description && <p className='text-subtle'>{description}</p>}
      </div>
      <StatList items={items} />
    </div>
  )
}

// The logos sit the same height either side of a short middle row, so the heart, centred across all three, overlaps both.
function PartnerLockup({ partnerLogo }: { partnerLogo: BlockImage }) {
  return (
    <div className='grid grow basis-50 grid-rows-[auto_1.5rem_auto] content-start justify-items-center'>
      <Logo size='xl' className='col-start-1 row-start-1' />
      <BlockImg
        image={partnerLogo}
        className='col-start-1 row-start-3 h-12 w-auto'
      />
      <Heart
        outline
        className='col-start-1 row-span-full size-16 self-center'
      />
    </div>
  )
}
