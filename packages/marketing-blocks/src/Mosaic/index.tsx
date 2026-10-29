import { useId } from 'react'

import { Mark } from '@oztix/roadie-components/mark'
import { cn } from '@oztix/roadie-core/utils'

import type { BlockImage } from '../Provider'
import { BlockHeading } from '../_shared/BlockHeading'
import { BlockImg } from '../_shared/BlockImg'
import { BlockRoot } from '../_shared/BlockRoot'
import { presetOf } from '../_shared/presets'
import { type MosaicPreset, mosaicDefinition } from './definition'

export type { MosaicPreset } from './definition'

export type MosaicTile = {
  /** Who the tile is for, such as a partner's name: shown as text when there's no logo, and the logo's alt text when that's empty. */
  name: string
  /** Marked at the foot of the tile, such as a partnership level like `Presenting partner`. `logo-strip` doesn't show it. */
  label?: string
  /** The tile's logo. On `tiers` it sits over the photo's dark shade, so a light or white logo suits it. Without one, the tile shows its `name` as text. */
  logo?: BlockImage
  /** A photo filling the tile, such as from the partner's event. Decorative, so its alt text isn't read. Without one, `tiers` sets the tile on a plain surface. */
  image?: BlockImage
  /** Spans two columns at half height, for the tiles to lead with. `tiers` only. */
  featured?: boolean
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
   * The look to render: `tiers` for photo tiles, or `logo-strip` for a row of logos alone.
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
  titleHighlight?: string | string[]
  /** A sentence under the title. */
  description?: string
  /** The photo tiles, in order. */
  tiles: readonly MosaicTile[]
  /** A last, wide tile of logos. `tiers` only. */
  logoTile?: MosaicLogoTile
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
const STRIP_LOGO_HEIGHT = 48

/** Logos in a grid: as photo tiles with a marked label, some two columns wide, or as a strip of logos alone. */
export function Mosaic({
  preset,
  position,
  id,
  eyebrow,
  title,
  titleHighlight,
  description,
  tiles,
  logoTile
}: MosaicProps) {
  const { name, variant } = presetOf(mosaicDefinition, preset)
  const headingId = useId()
  return (
    <BlockRoot
      block={mosaicDefinition.name}
      variant={variant}
      preset={name}
      position={position}
      id={id}
      aria-labelledby={headingId}
    >
      <div className='container-8xl grid gap-12 *:min-w-0'>
        <BlockHeading
          id={headingId}
          align={name === 'logo-strip' ? 'center' : 'start'}
          eyebrow={eyebrow}
          title={title}
          titleHighlight={titleHighlight}
          description={description}
        />
        {name === 'logo-strip' ? (
          <ul className='flex flex-wrap items-center justify-center gap-x-12 gap-y-8'>
            {tiles.map((tile, index) => (
              <StripLogo key={`${index}-${tile.name}`} {...tile} />
            ))}
          </ul>
        ) : (
          <ul className={GRID}>
            {tiles.map((tile, index) => (
              <PhotoTile key={`${index}-${tile.name}`} {...tile} />
            ))}
            {logoTile && <LogosTile {...logoTile} />}
          </ul>
        )}
      </div>
    </BlockRoot>
  )
}

function PhotoTile({ name, label, logo, image, featured }: MosaicTile) {
  return (
    <li
      data-featured={featured || undefined}
      className={cn(TILE, featured && WIDE, !image && 'emphasis-raised')}
    >
      {image && (
        <>
          <BlockImg
            image={{ ...image, alt: '' }}
            sizes={featured ? WIDE_SIZES : TILE_SIZES}
            className='absolute inset-0 -z-1 size-full object-cover'
          />
          <div
            aria-hidden
            className='absolute inset-0 -z-1 bg-linear-to-b from-transparent from-40% to-(--color-neutral-light-13)/80 to-90%'
          />
        </>
      )}
      <div className={cn(STACKED, featured ? HALF_HEIGHT : SQUARE)} />
      <div
        className={cn(
          STACKED,
          'grid content-end justify-items-start gap-1.5 p-1.5 @xl:p-2 @3xl:p-3'
        )}
      >
        {logo ? (
          <BlockImg
            image={{ ...logo, alt: logo.alt || name }}
            sizes='(min-width: 768px) 15vw, 30vw'
            className='h-auto max-w-3/4 object-contain'
          />
        ) : (
          <p className='text-display-ui-4 break-words text-strong'>{name}</p>
        )}
        {label && (
          <Mark
            render={<p />}
            intent='neutral'
            className='px-1.5 py-0.5 text-sm font-semibold @xl:text-base'
          >
            {label}
          </Mark>
        )}
      </div>
    </li>
  )
}

function LogosTile({ title = 'Also supporting', logos }: MosaicLogoTile) {
  return (
    <li className={cn(TILE, WIDE, 'emphasis-inverted')}>
      <div className={cn(STACKED, HALF_HEIGHT)} />
      <div
        className={cn(
          STACKED,
          'grid content-center justify-items-center gap-1 p-2 @3xl:gap-2'
        )}
      >
        <Mark render={<h3 />} intent='neutral' className='text-display-prose-5'>
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

// A logo without both dimensions has no ratio to size by, so it asks for a
// width that fits most wordmarks at the strip's height.
function stripLogoSizes({ width, height }: BlockImage) {
  const ratio = width && height ? width / height : 4
  return `${Math.round(STRIP_LOGO_HEIGHT * ratio)}px`
}

function StripLogo({ name, logo }: MosaicTile) {
  return (
    <li>
      {logo ? (
        <BlockImg
          image={{ ...logo, alt: logo.alt || name }}
          sizes={stripLogoSizes(logo)}
          className='h-12 w-auto object-contain'
        />
      ) : (
        <p className='text-display-ui-4 break-words text-strong'>{name}</p>
      )}
    </li>
  )
}
