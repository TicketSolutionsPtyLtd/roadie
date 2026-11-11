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
  type SpotIllustrationName,
  spotIllustration
} from '../_shared/illustrations'
import {
  cycledMarkIntent,
  filledIntent,
  itemIntent,
  itemSurface,
  itemSurfaceClass,
  markIntent
} from '../_shared/items'
import {
  type BlockAlign,
  type BlockEmphasis,
  type BlockIntent,
  type BlockSize,
  type ItemEmphasis,
  gapOf,
  ratioClass
} from '../_shared/surface'
import { useBlock } from '../_shared/useBlock'
import { type CardsPreset, cardsDefinition } from './definition'

export type { CardsPreset } from './definition'

export type CardsItem = {
  /** The card's heading, marked over the photo in `photo`. */
  title: string
  /** A short line under the title, such as a person's role in `photo`. `steps` leaves it out. */
  subtitle?: string
  /** Every preset but `photo` and `lists` shows it. */
  description?: string
  /** Every preset but `lists` shows it. */
  image?: BlockImage
  /** Shown by `plain`, `text-blocks`, and `overlap`. In `plain`, it overlaps the image's lower edge, or sits above the title with no image. */
  illustration?: SpotIllustrationName
  /** The list `lists` shows under the title. */
  points?: readonly string[]
  /** The item's own page. Its title becomes the link, and the whole card the place to click. */
  href?: string
  /**
   * This item's intent, in place of the block's. It tints the card in `plain`, `steps`, `text-blocks`, and `lists`, and sets the mark that carries the preset's colour: the title in `text-blocks` and `overlap`, the number in `steps`, and the subtitle in `photo`.
   */
  intent?: BlockIntent
}

export type CardsProps = {
  /**
   * The look. Every preset is a grid of cards. `plain` shows what each item has: an image, and an illustration over it or above the title. `steps` numbers the cards in order.
   * @default 'plain'
   */
  preset?: CardsPreset
  /** The block's place on the page, counting from 1, reported with its events. */
  position?: number
  /** An id for linking to the block. */
  id?: string
  /**
   * The block's intent. Its highlighted words, strong action, and every card's mark take it: the title in `text-blocks` and `overlap`, the number in `steps`, and the subtitle in `photo`. Without one, marks keep the preset's colours: info, brand-secondary, or a cycle of info, brand, and brand-secondary.
   */
  intent?: BlockIntent
  /** The surface behind the block. Unset, `photo` sits on `raised` and the other presets have none. */
  emphasis?: BlockEmphasis
  /** Draws the surface as a panel inside the page's padding instead of a full-width band. Unset, `photo` is contained and the other presets are bands. */
  contained?: boolean
  /** Every card's surface. Unset, cards have none, though a linked card with none takes `subtler`. `overlap` and `photo` ignore it, since they draw an inverted panel or a photo. */
  itemEmphasis?: ItemEmphasis
  /** The heading's alignment, and in `plain` and `steps`, the card text's too. Unset, `plain`, `steps`, `text-blocks`, and `overlap` centre the heading, `plain` and `steps` start the card text, and `photo` and `lists` start the heading. */
  align?: BlockAlign
  /**
   * `md` and `sm` set the title one and two steps smaller and tighten the gap under the heading.
   * @default 'lg'
   */
  size?: BlockSize
  /** A short line above the title. */
  eyebrow?: string
  title: string
  /** Words in the title to mark, such as `partners`. */
  highlight?: string | string[]
  /** A sentence under the title. */
  description?: string
  cards: readonly CardsItem[]
  /** Links under the cards, such as to see them all. The first is the strong one. */
  actions?: readonly BlockAction[]
}

type CardProps = {
  item: CardsItem
  index: number
  itemEmphasis: ItemEmphasis | undefined
  blockIntent: BlockIntent | undefined
  /** The intent an opaque card sets again on a filled block. */
  filled: BlockIntent | undefined
  /** Centres the card's text, in `plain` and `steps`. */
  centred: boolean
}

function CardTitle({ item }: { item: CardsItem }) {
  if (!item.href) return item.title
  return <Card.Link href={item.href}>{item.title}</Card.Link>
}

/** A Roadie card as a list item. Nothing between its root and its title link is positioned, so the link's overlay reaches the card's edges. */
function GridCard({
  item,
  itemEmphasis,
  filled,
  className,
  children
}: {
  item: CardsItem
  itemEmphasis: ItemEmphasis | undefined
  filled: BlockIntent | undefined
  className: string
  children: ReactNode
}) {
  const surface = itemSurface(item, itemEmphasis)
  return (
    <Card
      render={<li />}
      intent={itemIntent(item, surface, filled)}
      emphasis={surface ?? null}
      className='min-w-0'
    >
      <Card.Content className={cn(className, !surface && 'p-0')}>
        {children}
      </Card.Content>
    </Card>
  )
}

function Illustration({
  name,
  className
}: {
  name: SpotIllustrationName | undefined
  className: string
}) {
  const Drawing = spotIllustration(name)
  return Drawing ? <Drawing outline className={className} /> : null
}

// A tile that draws its own photo has no surface to tint, so a linked one grows its photo instead.
const GROWS_ON_HOVER =
  'transition-transform duration-moderate ease-standard motion-safe:group-hover/tile:scale-105 motion-safe:group-has-[[data-interactive-target]:focus-visible]/tile:scale-105'

// The frame sets the shape, so a sized photo is cropped to it rather than keeping its own ratio.
function CardImage({
  image,
  sizes,
  className,
  grows = false
}: {
  image: BlockImage | undefined
  sizes: string
  className: string
  /** Grows the photo while its linked tile is hovered or focused. */
  grows?: boolean
}) {
  return (
    <div
      aria-hidden={!image || undefined}
      className={cn('relative overflow-hidden bg-subtle', className)}
    >
      {image && (
        <BlockImg
          image={image}
          sizes={sizes}
          className={cn(
            'absolute inset-0 size-full object-cover',
            grows && GROWS_ON_HOVER
          )}
        />
      )}
    </div>
  )
}

// An image makes a feature card; with none, the card is a compact link-style one.
function PlainCard(props: CardProps) {
  const { item, itemEmphasis, centred } = props
  const compact = !item.image
  const illustration = (
    <Illustration
      name={item.illustration}
      className={compact ? 'size-12' : 'relative -mt-20 size-20'}
    />
  )
  return (
    <GridCard
      item={item}
      itemEmphasis={itemEmphasis}
      filled={props.filled}
      className={cn('grid content-start', compact ? 'gap-4' : 'gap-8')}
    >
      {item.image && (
        <CardImage
          image={item.image}
          sizes='(min-width: 1024px) 33vw, 100vw'
          className={cn(ratioClass.banner, 'w-full rounded-2xl')}
        />
      )}
      {compact && illustration}
      <div
        className={cn(
          'grid gap-2',
          centred && 'justify-items-center text-center'
        )}
      >
        {!compact && illustration}
        <h3
          className={cn(
            'text-strong',
            compact ? 'text-display-prose-5' : 'text-display-prose-4'
          )}
        >
          <CardTitle item={item} />
        </h3>
        {item.subtitle && (
          <p className='text-lg font-medium text-strong'>{item.subtitle}</p>
        )}
        {item.description && (
          <p className={cn('text-subtle', !compact && 'text-lg')}>
            {item.description}
          </p>
        )}
      </div>
    </GridCard>
  )
}

function StepCard(props: CardProps) {
  const { item, index, itemEmphasis, centred } = props
  return (
    <GridCard
      item={item}
      itemEmphasis={itemEmphasis}
      filled={props.filled}
      className={cn(
        'grid content-start gap-4',
        centred ? 'justify-items-center text-center' : 'justify-items-start'
      )}
    >
      {item.image && (
        <CardImage
          image={item.image}
          sizes='(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw'
          className={cn(ratioClass.banner, 'w-full rounded-2xl')}
        />
      )}
      <Mark
        aria-hidden
        render={<span />}
        intent={markIntent(item, props.blockIntent, 'brand-secondary')}
        className='px-3 py-1 text-display-prose-2 tabular-nums'
      >
        {index + 1}
      </Mark>
      <div className='grid gap-2'>
        <h3 className='text-display-prose-4 text-strong'>
          <CardTitle item={item} />
        </h3>
        {item.description && (
          <p className='text-lg text-subtle'>{item.description}</p>
        )}
      </div>
    </GridCard>
  )
}

function ServiceCard(props: CardProps) {
  const { item, itemEmphasis } = props
  return (
    <GridCard
      item={item}
      itemEmphasis={itemEmphasis}
      filled={props.filled}
      className='grid content-start gap-6'
    >
      <CardImage
        image={item.image}
        sizes='(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw'
        className={cn(ratioClass.landscape, 'w-full rounded-2xl')}
      />
      <div className='grid @2xl:pt-2'>
        <div className='grid justify-self-start'>
          <Mark
            render={<h3 />}
            intent={markIntent(props.item, props.blockIntent, 'info')}
            className='col-start-1 row-start-1 text-display-prose-4'
          >
            <CardTitle item={item} />
          </Mark>
          <Illustration
            name={item.illustration}
            className='pointer-events-none z-1 col-start-1 row-start-1 -mt-20 ml-2 self-start justify-self-start @2xl:-mt-6 @2xl:-mr-6 @2xl:ml-0 @2xl:justify-self-end'
          />
        </div>
        {item.subtitle && (
          <Mark
            render={<p />}
            intent='neutral'
            className='px-2 py-1 text-display-prose-5'
          >
            {item.subtitle}
          </Mark>
        )}
      </div>
      {item.description && <p>{item.description}</p>}
    </GridCard>
  )
}

function IndustryCard(props: CardProps) {
  const { item } = props
  return (
    <li className='group/tile is-interactive-within grid min-w-0 grid-rows-[auto_1fr] rounded-2xl'>
      <CardImage
        image={item.image}
        sizes='(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw'
        className={cn(ratioClass.square, 'w-full rounded-2xl')}
        grows={!!item.href}
      />
      <div className='z-1 -mt-6 grid content-start gap-4 rounded-2xl emphasis-inverted p-6 intent-neutral'>
        <Illustration name={item.illustration} className='-mt-16 size-16' />
        <Mark
          render={<h3 />}
          intent={cycledMarkIntent(props.item, props.blockIntent, props.index)}
          className='text-display-prose-4'
        >
          <CardTitle item={item} />
        </Mark>
        <div className='grid gap-1'>
          {item.subtitle && (
            <p className='text-lg font-medium'>{item.subtitle}</p>
          )}
          {item.description && <p>{item.description}</p>}
        </div>
      </div>
    </li>
  )
}

function PhotoCard(props: CardProps) {
  const { item } = props
  return (
    <li className='group/tile dark is-interactive-within relative grid aspect-square min-w-0 overflow-hidden rounded-2xl'>
      <CardImage
        image={item.image}
        sizes='(min-width: 1280px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw'
        className='absolute inset-0 size-full'
        grows={!!item.href}
      />
      <div className='z-1 grid self-end p-4'>
        <Mark render={<h3 />} intent='neutral' className='text-display-ui-4'>
          <CardTitle item={item} />
        </Mark>
        {item.subtitle && (
          <Mark
            render={<p />}
            intent={markIntent(props.item, props.blockIntent, 'info')}
            className='max-w-full px-2 py-1 font-medium text-pretty'
          >
            {item.subtitle}
          </Mark>
        )}
      </div>
    </li>
  )
}

function ListColumn({ item, itemEmphasis, filled }: CardProps) {
  return (
    <li
      className={cn(
        itemSurfaceClass(item, itemEmphasis, filled),
        'grid content-start gap-4 rounded-2xl'
      )}
    >
      <h3 className='text-display-prose-5 text-strong'>
        <CardTitle item={item} />
      </h3>
      {item.points && item.points.length > 0 && (
        <ul className='grid gap-2'>
          {item.points.map((point, index) => (
            <li key={`${index}-${point}`} className='text-lg font-medium'>
              {point}
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

type Look = {
  Item: (props: CardProps) => ReactNode
  list: string
}

// Columns follow the block's own width, not the viewport's, so a block in a narrow layout stays narrow.
// Four 15rem cards with gap-12 fit from 76rem, so a 1280px window with a classic scrollbar still sets four across.
const LOOKS: Record<CardsPreset, Look> = {
  plain: {
    Item: PlainCard,
    list: 'grid grid-cols-1 gap-12 @2xl:grid-cols-2 @4xl:grid-cols-3'
  },
  steps: {
    Item: StepCard,
    list: 'grid grid-cols-1 gap-12 @2xl:grid-cols-2 @5xl:grid-cols-3 @[76rem]:grid-cols-4'
  },
  'text-blocks': {
    Item: ServiceCard,
    list: 'grid grid-cols-1 gap-12 @2xl:grid-cols-2 @[76rem]:grid-cols-4'
  },
  overlap: {
    Item: IndustryCard,
    list: 'grid grid-cols-1 gap-12 @2xl:grid-cols-2 @5xl:grid-cols-3'
  },
  photo: {
    Item: PhotoCard,
    list: 'grid grid-cols-1 gap-8 @xl:grid-cols-2 @4xl:grid-cols-3 @6xl:grid-cols-4'
  },
  lists: {
    Item: ListColumn,
    list: 'grid grid-cols-[repeat(auto-fit,minmax(min(16rem,100%),1fr))] gap-8'
  }
}

// Compact cards with no images fit two from a narrower width.
const COMPACT_LIST = 'grid grid-cols-1 gap-6 @xl:grid-cols-2 @4xl:grid-cols-3'

function listOf(name: CardsPreset, cards: readonly CardsItem[]) {
  if (name !== 'plain' || cards.some((card) => card.image))
    return LOOKS[name].list
  return COMPACT_LIST
}

/** Like items, such as benefits, services, steps, contact options, values, or people, as cards in columns. */
export function Cards(props: CardsProps) {
  const { intent, itemEmphasis, align, size, eyebrow, cards } = props
  const block = useBlock(cardsDefinition, props)
  const { name } = block
  const look = LOOKS[name]
  const { Item } = look
  const headingAlign = block.align
  const List = name === 'steps' ? 'ol' : 'ul'
  const markedEyebrow = name === 'overlap' && eyebrow

  return (
    <BlockRoot {...block.root}>
      <BlockSurface
        emphasis={block.emphasis}
        contained={block.contained}
        className={cn('grid grid-cols-1 wrap-anywhere', gapOf(size, 'loose'))}
      >
        <div className='grid min-w-0 grid-cols-1 justify-items-center gap-4'>
          {markedEyebrow && (
            <Mark
              render={<p />}
              intent={intent ?? 'brand-secondary'}
              className={cn(
                'px-2 py-1 text-display-prose-5',
                headingAlign === 'center'
                  ? 'justify-self-center'
                  : 'justify-self-start'
              )}
            >
              {eyebrow}
            </Mark>
          )}
          <BlockHeading
            {...block.heading}
            eyebrow={markedEyebrow ? undefined : eyebrow}
            wide={headingAlign === 'start'}
            className='w-full'
          />
        </div>
        <List className={listOf(name, cards)}>
          {cards.map((item, index) => (
            <Item
              key={`${index}-${item.title}`}
              item={item}
              index={index}
              itemEmphasis={itemEmphasis}
              blockIntent={intent}
              filled={filledIntent(intent, block.emphasis)}
              centred={align === 'center'}
            />
          ))}
        </List>
        <BlockActions {...block.actions} />
      </BlockSurface>
    </BlockRoot>
  )
}
