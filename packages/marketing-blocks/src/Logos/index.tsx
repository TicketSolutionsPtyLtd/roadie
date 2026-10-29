import { useId } from 'react'

import { Mark } from '@oztix/roadie-components/mark'
import { cn } from '@oztix/roadie-core/utils'

import type { BlockImage } from '../Provider'
import { BlockHeading } from '../_shared/BlockHeading'
import { BlockImg } from '../_shared/BlockImg'
import { BlockRoot } from '../_shared/BlockRoot'
import { presetOf } from '../_shared/presets'
import { logosDefinition } from './definition'

export type LogosPreset = (typeof logosDefinition.presets)[number]['name']

export type LogosPartner = {
  /** The partner's name, read out when its logo has no alt text. */
  name: string
  /** The partnership level, such as `Presenting partner`, marked under the logo. */
  level: string
  /** The partner's logo, drawn light over the photo. */
  logo: BlockImage
  /** A photo behind the logo, such as from the partner's event. Decorative, so its alt text isn't read. */
  image: BlockImage
  /** Spans two columns at half height, for the partners to lead with. */
  featured?: boolean
}

export type LogosAlso = {
  /** The tile's title. Defaults to `Also supporting`. */
  title?: string
  /** Smaller logos of the partners without a tile of their own. */
  logos: readonly BlockImage[]
}

export type LogosProps = {
  /** The look to render. `partner-tiers` is the only one so far. */
  preset?: LogosPreset
  /** The block's order on the page, counting from 1, reported with its events. */
  position?: number
  /** The section's id, for linking to it. */
  id?: string
  /** A short line above the title. */
  eyebrow?: string
  /** The section title, as an `h2`. */
  title: string
  /** Words in the title to mark, such as `partnerships`. */
  titleHighlight?: string | string[]
  /** A sentence under the title. */
  description?: string
  /** A tile per partner, in order. */
  partners: readonly LogosPartner[]
  /** A last, wide tile of the remaining logos. */
  also?: LogosAlso
}

// The half-height tile's padding is a percentage of its own width, two
// columns and a gap, so it subtracts half the gap to match a square tile.
const GRID =
  'grid grid-flow-row-dense gap-(--tile-gap) [--tile-gap:--spacing(2)] grid-cols-[repeat(auto-fit,minmax(min(13.25rem,calc(50%-var(--tile-gap)/2)),1fr))] @xl:[--tile-gap:--spacing(4)] @3xl:[--tile-gap:--spacing(8)] @3xl:grid-cols-[repeat(auto-fit,minmax(min(15.625rem,calc(25%-var(--tile-gap)*3/4)),1fr))]'
const TILE =
  'dark relative isolate grid overflow-hidden rounded-xl @3xl:rounded-3xl'
const STACKED = 'col-start-1 row-start-1'
const SQUARE = 'pt-[100%]'
const WIDE = 'col-span-2'
const HALF_HEIGHT = 'pt-[calc(50%-var(--tile-gap)/2)]'
const TILE_SIZES = '(min-width: 768px) 25vw, 50vw'
const WIDE_SIZES = '(min-width: 768px) 50vw, 100vw'

/** Logo tiles of the organisations behind Oztix: each over a photo with its partnership level, then the rest together. */
export function Logos({
  preset,
  position,
  id,
  eyebrow,
  title,
  titleHighlight,
  description,
  partners,
  also
}: LogosProps) {
  const { name, variant } = presetOf(logosDefinition, preset)
  const headingId = useId()
  return (
    <BlockRoot
      block={logosDefinition.name}
      variant={variant}
      preset={name}
      position={position}
      id={id}
      aria-labelledby={headingId}
    >
      <div className='container-8xl grid gap-12'>
        <BlockHeading
          id={headingId}
          align='start'
          eyebrow={eyebrow}
          title={title}
          titleHighlight={titleHighlight}
          description={description}
        />
        <ul className={GRID}>
          {partners.map((partner) => (
            <PartnerTile key={partner.name} {...partner} />
          ))}
          {also && <AlsoTile {...also} />}
        </ul>
      </div>
    </BlockRoot>
  )
}

function PartnerTile({ name, level, logo, image, featured }: LogosPartner) {
  return (
    <li
      data-featured={featured || undefined}
      className={cn(TILE, featured && WIDE)}
    >
      <BlockImg
        image={{ ...image, alt: '' }}
        sizes={featured ? WIDE_SIZES : TILE_SIZES}
        className='absolute inset-0 -z-1 size-full object-cover'
      />
      <div
        aria-hidden
        className='absolute inset-0 -z-1 bg-linear-to-b from-transparent from-40% to-(--color-neutral-light-13)/80 to-90%'
      />
      <div className={cn(STACKED, featured ? HALF_HEIGHT : SQUARE)} />
      <div
        className={cn(
          STACKED,
          'grid content-end justify-items-start gap-1.5 p-1.5 @xl:p-2 @3xl:p-3'
        )}
      >
        <BlockImg
          image={{ ...logo, alt: logo.alt || name }}
          sizes='(min-width: 768px) 15vw, 30vw'
          className='h-auto max-w-3/4 object-contain'
        />
        <Mark
          render={<p />}
          intent='neutral'
          className='text-display-ui-6 font-bold'
        >
          {level}
        </Mark>
      </div>
    </li>
  )
}

function AlsoTile({ title = 'Also supporting', logos }: LogosAlso) {
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
          {logos.map((logo) => (
            <BlockImg
              key={logo.src}
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
