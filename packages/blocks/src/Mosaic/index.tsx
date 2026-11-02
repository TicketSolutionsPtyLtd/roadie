import type { ReactNode } from 'react'

import { Card } from '@oztix/roadie-components/card'
import { Mark } from '@oztix/roadie-components/mark'
import { cn } from '@oztix/roadie-core/utils'

import type { BlockAction, BlockImage } from '../Provider'
import { BlockActions } from '../_shared/BlockActions'
import { BlockHeading } from '../_shared/BlockHeading'
import { BlockImg } from '../_shared/BlockImg'
import { BlockRoot } from '../_shared/BlockRoot'
import { BlockSurface } from '../_shared/BlockSurface'
import {
  type BlockAlign,
  type BlockEmphasis,
  type BlockIntent,
  type BlockSize,
  gapOf
} from '../_shared/surface'
import { useBlock } from '../_shared/useBlock'
import { type MosaicPreset, mosaicDefinition } from './definition'

export type { MosaicPreset } from './definition'

export type MosaicTile = {
  /** Who the tile is for, such as a partner's name: shown as text when there's no logo, and the logo's alt text when that's empty. */
  title: string
  /** Marked at the foot of the tile, such as a partnership level like `Presenting partner`. */
  description?: string
  /** The tile's logo. On `tiers` it sits over the photo's dark shade, so a light or white logo suits it. Without one, the tile shows its `title` as text. */
  logo?: BlockImage
  /** A photo filling the tile, such as from the partner's event. Decorative, so its alt text isn't read. Without one, `tiers` sets the tile on a plain surface. */
  image?: BlockImage
  /**
   * `lg` spans two columns at half height, for the tiles to lead with.
   * @default 'md'
   */
  size?: 'md' | 'lg'
  /** Where the tile goes. Its title, or its logo, becomes the link, and the whole tile takes the click. */
  href?: string
  /** The tile's own intent, for its `description` mark, in place of the block's. */
  intent?: BlockIntent
}

export type MosaicLogoTile = {
  /**
   * The tile's title.
   * @default 'Also supporting'
   */
  title?: string
  /** Smaller logos of those without a tile of their own. */
  logos: readonly BlockImage[]
}

export type MosaicProps = {
  /**
   * `tiers` sets photo tiles with a logo and a marked level, some two columns wide.
   * @default 'tiers'
   */
  preset?: MosaicPreset
  /** The block's place on the page, counting from 1, reported with its events. */
  position?: number
  /** An id for linking to the block. */
  id?: string
  /** A short line above the title. */
  eyebrow?: string
  /** The section title, as an `h2`. */
  title: string
  /** Words in the title to mark, such as `partnerships`. */
  highlight?: string | string[]
  /** A sentence under the title. */
  description?: string
  /** The photo tiles, in order. */
  tiles: readonly MosaicTile[]
  /** A last, wide tile of logos. */
  logoTile?: MosaicLogoTile
  /** Links under the tiles, as buttons. The first is the strong one. */
  actions?: readonly BlockAction[]
  /** The block's intent: the tile descriptions' marks, the highlighted words, and the strong action take it. Without one, descriptions are neutral and highlights brand-secondary. */
  intent?: BlockIntent
  /** The surface behind the block. Without one, the tiles sit on the page. */
  emphasis?: BlockEmphasis
  /** Draws the surface inside the page's padding, rounded at every width, instead of as a full-width band. */
  contained?: boolean
  /**
   * Where the heading and actions line up.
   * @default 'start'
   */
  align?: BlockAlign
  /**
   * `md` and `sm` set the title one and two steps smaller, with tighter spacing.
   * @default 'lg'
   */
  size?: BlockSize
}

// Tiles are at least 11rem, so a column joins for every 11rem of block, from
// two on a phone to four at most. The half-height tile's padding is a
// percentage of its own width, two columns and a gap, so it subtracts half
// the gap to match a square tile.
const GRID =
  'grid grid-flow-row-dense gap-(--tile-gap) *:min-w-0 [--tile-gap:--spacing(2)] grid-cols-[repeat(auto-fill,minmax(min(max(11rem,calc(25%-var(--tile-gap)*3/4)),calc(50%-var(--tile-gap)/2)),1fr))] @xl:[--tile-gap:--spacing(4)] @3xl:[--tile-gap:--spacing(8)]'
const TILE =
  'dark relative isolate grid overflow-hidden rounded-xl @3xl:rounded-3xl'
const STACKED = 'col-start-1 row-start-1'
const SQUARE = 'pt-[100%]'
const WIDE = 'col-span-2'
const HALF_HEIGHT = 'pt-[calc(50%-var(--tile-gap)/2)]'
const TILE_SIZES = '(min-width: 768px) 25vw, 50vw'
const WIDE_SIZES = '(min-width: 768px) 50vw, 100vw'

/** Partners in a grid of photo tiles, each with a logo and a marked label, some two columns wide. */
export function Mosaic(props: MosaicProps) {
  const { tiles, logoTile, intent, size } = props
  const block = useBlock(mosaicDefinition, props)
  return (
    <BlockRoot {...block.root}>
      <BlockSurface
        emphasis={block.emphasis}
        contained={block.contained}
        className={cn('grid *:min-w-0', gapOf(size, 'loose'))}
      >
        <BlockHeading {...block.heading} />
        <ul className={GRID}>
          {tiles.map((tile, index) => (
            <PhotoTile
              key={`${index}-${tile.title}`}
              {...tile}
              intent={tile.intent ?? intent}
            />
          ))}
          {logoTile && <LogosTile {...logoTile} />}
        </ul>
        <BlockActions {...block.actions} />
      </BlockSurface>
    </BlockRoot>
  )
}

function PhotoTile({
  title,
  description,
  logo,
  image,
  size,
  href,
  intent
}: MosaicTile) {
  const wide = size === 'lg'
  return (
    <li
      data-size={wide ? 'lg' : undefined}
      className={cn(
        TILE,
        wide && WIDE,
        // Over a photo's dark shade, text stays light in either mode. The intent
        // resolves its colours again here, under the dark scale.
        image ? 'intent-neutral' : 'emphasis-raised',
        href && 'group/tile is-interactive-within'
      )}
    >
      {image && (
        <>
          <BlockImg
            image={{ ...image, alt: '' }}
            sizes={wide ? WIDE_SIZES : TILE_SIZES}
            className='absolute inset-0 -z-1 size-full object-cover transition-[scale] duration-moderate ease-standard motion-safe:group-focus-within/tile:scale-105 motion-safe:group-hover/tile:scale-105'
          />
          <div
            aria-hidden
            className='absolute inset-0 -z-1 bg-linear-to-b from-transparent from-40% to-(--color-neutral-light-13)/80 to-90%'
          />
        </>
      )}
      <div className={cn(STACKED, wide ? HALF_HEIGHT : SQUARE)} />
      <div
        className={cn(
          STACKED,
          'grid content-end justify-items-start gap-1.5 p-1.5 @xl:p-2 @3xl:p-3'
        )}
      >
        <Linked href={href} title={title} logo={logo}>
          {logo ? (
            <BlockImg
              image={{ ...logo, alt: logo.alt || title }}
              sizes='(min-width: 768px) 15vw, 30vw'
              className='h-auto max-w-3/4 object-contain'
            />
          ) : (
            <p className='text-display-ui-4 break-words text-strong'>{title}</p>
          )}
        </Linked>
        {description && (
          <Mark
            render={<p />}
            intent={intent ?? 'neutral'}
            className='px-1.5 py-0.5 text-sm font-semibold @xl:text-base'
          >
            {description}
          </Mark>
        )}
      </div>
    </li>
  )
}

function LogosTile({ title = 'Also supporting', logos }: MosaicLogoTile) {
  return (
    <li className={cn(TILE, WIDE, 'emphasis-raised')}>
      <div className={cn(STACKED, HALF_HEIGHT)} />
      <div
        className={cn(
          STACKED,
          'grid content-center justify-items-center gap-1 p-2 @3xl:gap-2'
        )}
      >
        <Mark
          render={<h3 />}
          intent='neutral'
          className='justify-self-center text-display-prose-5'
        >
          {title}
        </Mark>
        <div className='flex flex-wrap items-center justify-center gap-2'>
          {logos.map((logo, index) => (
            <BlockImg
              key={`${index}-${logo.src}`}
              image={logo}
              sizes='(min-width: 768px) 8vw, 20vw'
              className='h-auto max-w-1/5 object-contain'
            />
          ))}
        </div>
      </div>
    </li>
  )
}

// A logo link is named by the tile, so a click reports the title, not the alt text.
function Linked({
  href,
  title,
  logo,
  children
}: Pick<MosaicTile, 'href' | 'title' | 'logo'> & { children: ReactNode }) {
  if (!href) return children
  return (
    <Card.Link href={href} aria-label={logo ? title : undefined}>
      {children}
    </Card.Link>
  )
}
