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
  /** Who the tile is for, such as a partner's or venue's name: shown as text when there's no logo, and the logo's alt text when that's empty. */
  title: string
  /** Marked at the foot of the tile, such as a partnership level like `Presenting partner` or a venue's city. */
  description?: string
  /** The tile's logo. Over a photo it sits on the photo's dark shade, so a light or white logo suits it. Without one, the tile shows its `title` as text. */
  logo?: BlockImage
  /** A photo filling the tile, such as of the venue or event it's for. Decorative, so its alt text isn't read. Without one, the tile sits on a plain surface. */
  image?: BlockImage
  /**
   * Every size is one row tall, so sizes mix freely: `sm` is a square, `md` spans two columns, and `lg` the full row.
   * @default 'sm'
   */
  size?: MosaicTileSize
  /** Where the tile goes. Its title, or its logo, becomes the link, and the whole tile takes the click. */
  href?: string
  /** The tile's own intent, for its `description` mark, in place of the block's. */
  intent?: BlockIntent
}

/** A tile's width in the grid. */
export type MosaicTileSize = 'sm' | 'md' | 'lg'

export type MosaicLogoTile = {
  /** The tile's title, such as `Also supporting`. Without one, the tile shows only its logos. */
  title?: string
  /** Smaller logos of those without a tile of their own. */
  logos: readonly BlockImage[]
}

export type MosaicProps = {
  /**
   * `tiles` sets photo tiles with a logo and a marked label, some two columns wide.
   * @default 'tiles'
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
  /** Draws the `emphasis` inside the page's padding, rounded at every width, instead of as a full-width band. Read only when there's an `emphasis`. */
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

// Two columns, then four once the block is 48rem wide, and never three, so tiles
// that add up to a multiple of four columns fill every row. The half-height tile's padding is a
// percentage of its own width, two columns and a gap, so it subtracts half
// the gap to match a square tile.
const GRID =
  'grid grid-flow-row-dense gap-(--tile-gap) *:min-w-0 [--tile-gap:--spacing(2)] grid-cols-2 @3xl:grid-cols-4 @xl:[--tile-gap:--spacing(4)] @3xl:[--tile-gap:--spacing(8)]'
const TILE =
  'dark relative isolate grid overflow-hidden rounded-xl @3xl:rounded-3xl'
const STACKED = 'col-start-1 row-start-1'
const SQUARE = 'pt-[100%]'
const WIDE = 'col-span-2'
const HALF_HEIGHT = 'pt-[calc(50%-var(--tile-gap)/2)]'
// A full-row tile shares the grid's columns, so a square in its first column
// sets its height to one row's, however many columns the grid fits.
const FULL = 'col-span-full grid-cols-subgrid'
const ACROSS = 'col-span-full row-start-1'

const SIZE: Record<
  MosaicTileSize,
  { tile?: string; sizer: string; content: string; sizes: string }
> = {
  sm: {
    sizer: cn(STACKED, SQUARE),
    content: STACKED,
    sizes: '(min-width: 768px) 25vw, 50vw'
  },
  md: {
    tile: WIDE,
    sizer: cn(STACKED, HALF_HEIGHT),
    content: STACKED,
    sizes: '(min-width: 768px) 50vw, 100vw'
  },
  lg: {
    tile: FULL,
    sizer: cn(STACKED, SQUARE),
    content: ACROSS,
    sizes: '100vw'
  }
}

/** A grid of photo tiles, each with a logo or title and a marked label, the large ones two columns wide. */
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
  size = 'sm',
  href,
  intent
}: MosaicTile) {
  const layout = SIZE[size]
  return (
    <li
      data-size={size}
      className={cn(
        TILE,
        layout.tile,
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
            sizes={layout.sizes}
            className='absolute inset-0 -z-1 size-full object-cover transition-[scale] duration-moderate ease-standard motion-safe:group-focus-within/tile:scale-105 motion-safe:group-hover/tile:scale-105'
          />
          <div
            aria-hidden
            className='absolute inset-0 -z-1 bg-linear-to-b from-transparent from-40% to-(--color-neutral-light-13)/80 to-90%'
          />
        </>
      )}
      <div className={layout.sizer} />
      <div
        className={cn(
          layout.content,
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

function LogosTile({ title, logos }: MosaicLogoTile) {
  return (
    <li className={cn(TILE, WIDE, 'emphasis-raised')}>
      <div className={cn(STACKED, HALF_HEIGHT)} />
      <div
        className={cn(
          STACKED,
          'grid content-center justify-items-center gap-1 p-2 @3xl:gap-2'
        )}
      >
        {title && (
          <Mark
            render={<h3 />}
            intent='neutral'
            className='justify-self-center text-display-prose-5'
          >
            {title}
          </Mark>
        )}
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
