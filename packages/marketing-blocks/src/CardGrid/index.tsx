import { type ReactNode, useId } from 'react'

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
  SPOT_ILLUSTRATIONS,
  type SpotIllustrationName
} from '../_shared/illustrations'
import { presetOf } from '../_shared/presets'
import {
  type BlockAlign,
  type BlockEmphasis,
  type BlockIntent,
  type BlockSize,
  type ItemEmphasis,
  emphasisClass,
  intentClass
} from '../_shared/surface'
import { type CardGridPreset, cardGridDefinition } from './definition'

export type { CardGridPreset } from './definition'

export type CardGridItem = {
  /** The card's heading, or a person's name in `portraits`. */
  title: string
  /** A short line under the title, or a person's role in `portraits`. Numbered cards leave it out. */
  subtitle?: string
  /** Every preset but `portraits` and `lists` shows it. */
  description?: string
  /** Every preset but `lists` shows it. */
  image?: BlockImage
  /** Shown by `cards`, `marked-cards`, and `overlap-cards`. In `cards`, it overlaps the image's lower edge, or sits above the title with no image. */
  illustration?: SpotIllustrationName
  /** The list `lists` shows under the title. */
  points?: readonly string[]
  /** The item's own page. Its title becomes the link, and the whole card the place to click. */
  href?: string
  /**
   * This item's intent, in place of the block's. It tints the card in `cards`, `marked-cards`, and `lists`, and sets the mark that carries the preset's colour: the title in `marked-cards` and `overlap-cards`, the number in numbered `cards`, and the role in `portraits`.
   */
  intent?: BlockIntent
}

export type CardGridProps = {
  /**
   * The look. Every preset is a grid of cards. `cards` shows what each item has: an image, an illustration over it or above the title, and with `numbered`, a number.
   * @default 'cards'
   */
  preset?: CardGridPreset
  /** The block's place on the page, counting from 1, reported with its events. */
  position?: number
  /** An id for linking to the block. */
  id?: string
  /**
   * The block's intent. Its highlighted words, strong action, and every card's mark take it: the title in `marked-cards` and `overlap-cards`, the number in numbered `cards`, and the role in `portraits`. Without one, marks keep the preset's colours: info, brand-secondary, or a cycle of info, brand, and brand-secondary.
   */
  intent?: BlockIntent
  /** The surface behind the block. Unset, `portraits` sits on `raised` and the other presets have none. */
  emphasis?: BlockEmphasis
  /** Draws the surface as a panel inside the page's padding instead of a full-width band. Unset, `portraits` is inset and the other presets are bands. */
  inset?: boolean
  /** Every card's surface. Unset, cards have none, though a linked card with none takes `subtler`. `overlap-cards` draws its panels on it, `raised` by default, and `portraits` ignores it, since it draws a photo. */
  itemEmphasis?: ItemEmphasis
  /** The heading's alignment, and in `cards`, the card text's too. Unset, `cards` centres the heading and starts the card text, `marked-cards` and `overlap-cards` centre the heading, and `portraits` and `lists` start it. */
  align?: BlockAlign
  /**
   * `md` sets the title a step smaller and tightens the gap under the heading.
   * @default 'lg'
   */
  size?: BlockSize
  /** Numbers `cards` in order, as an ordered list, for the steps of how it works. */
  numbered?: boolean
  /** A short line above the title. */
  eyebrow?: string
  title: string
  /** Words in the title to mark, such as `partners`. */
  titleHighlight?: string | string[]
  /** A sentence under the title. */
  description?: string
  items: readonly CardGridItem[]
  /** Links under the cards, such as to see them all. The first is the strong one. */
  actions?: readonly BlockAction[]
}

type CardProps = {
  item: CardGridItem
  index: number
  itemEmphasis: ItemEmphasis | undefined
  blockIntent: BlockIntent | undefined
  numbered: boolean
  /** Centres the card's text, in `cards`. */
  centred: boolean
}

// A linked card with no surface takes subtler, so its hover has somewhere to show.
const surfaceOf = (
  item: CardGridItem,
  itemEmphasis: ItemEmphasis | undefined
) => itemEmphasis ?? (item.href ? 'subtler' : undefined)

function CardTitle({ item }: { item: CardGridItem }) {
  if (!item.href) return item.title
  return <Card.Link href={item.href}>{item.title}</Card.Link>
}

/** A Roadie card as a list item. Nothing between its root and its title link is positioned, so the link's overlay reaches the card's edges. */
function GridCard({
  item,
  itemEmphasis,
  className,
  children
}: {
  item: CardGridItem
  itemEmphasis: ItemEmphasis | undefined
  className: string
  children: ReactNode
}) {
  const surface = surfaceOf(item, itemEmphasis)
  return (
    <Card
      render={<li />}
      intent={item.intent}
      emphasis={surface ?? null}
      className='min-w-0'
    >
      <Card.Content className={cn(className, !surface && 'p-0')}>
        {children}
      </Card.Content>
    </Card>
  )
}

// Own-markup cards follow Card's surfaces, padding a surface as Card.Content does.
function rowSurface(
  item: CardGridItem,
  itemEmphasis: ItemEmphasis | undefined
) {
  const surface = surfaceOf(item, itemEmphasis)
  return cn(
    'is-interactive-within min-w-0',
    intentClass(item.intent),
    emphasisClass(surface),
    surface === 'subtler' ? '-m-2 p-2' : surface && 'px-6 py-4'
  )
}

const MARK_CYCLE = ['info', 'brand', 'brand-secondary'] as const
const cycledIntent = ({ item, index, blockIntent }: CardProps) =>
  item.intent ?? blockIntent ?? MARK_CYCLE[index % MARK_CYCLE.length]
const markIntent = ({ item, blockIntent }: CardProps, fallback: BlockIntent) =>
  item.intent ?? blockIntent ?? fallback

function Illustration({
  name,
  className
}: {
  name: SpotIllustrationName | undefined
  className: string
}) {
  if (!name) return null
  const Drawing = SPOT_ILLUSTRATIONS[name]
  return <Drawing outline className={className} />
}

// The frame sets the shape, so a sized photo is cropped to it rather than keeping its own ratio.
// A tile that draws its own photo has no surface to tint, so a linked one grows its photo instead.
const GROWS_ON_HOVER =
  'transition-transform duration-moderate ease-standard motion-safe:group-hover/tile:scale-105 motion-safe:group-has-[[data-interactive-target]:focus-visible]/tile:scale-105'

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

// An image makes a feature card, numbered or not; with neither, the card is a compact link-style one.
function PlainCard(props: CardProps) {
  const { item, index, itemEmphasis, numbered, centred } = props
  const compact = !item.image && !numbered
  const illustration = !numbered && (
    <Illustration
      name={item.illustration}
      className={item.image ? 'relative -mt-20 size-20' : 'size-12'}
    />
  )
  return (
    <GridCard
      item={item}
      itemEmphasis={itemEmphasis}
      className={cn(
        'grid content-start',
        item.image && !numbered ? 'gap-8' : 'gap-4'
      )}
    >
      {item.image && (
        <CardImage
          image={item.image}
          sizes={
            numbered
              ? '(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw'
              : '(min-width: 1024px) 33vw, 100vw'
          }
          className='aspect-video w-full rounded-2xl'
        />
      )}
      {numbered && (
        <div className='flex items-end justify-between gap-4'>
          <Mark
            aria-hidden
            render={<span />}
            intent={markIntent(props, 'brand-secondary')}
            className='px-3 py-1 text-display-prose-2 tabular-nums'
          >
            {index + 1}
          </Mark>
          <Illustration name={item.illustration} className='size-12' />
        </div>
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
        {item.subtitle && !numbered && (
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

function ServiceCard(props: CardProps) {
  const { item, itemEmphasis } = props
  return (
    <GridCard
      item={item}
      itemEmphasis={itemEmphasis}
      className='grid content-start gap-6'
    >
      <CardImage
        image={item.image}
        sizes='(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw'
        className='aspect-video w-full rounded-2xl @2xl:aspect-4/3'
      />
      <div className='grid @2xl:pt-2'>
        <div className='grid justify-self-start'>
          <Mark
            render={<h3 />}
            intent={markIntent(props, 'info')}
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
  const { item, itemEmphasis } = props
  return (
    <li className='group/tile is-interactive-within grid min-w-0 grid-rows-[auto_1fr] rounded-2xl'>
      <CardImage
        image={item.image}
        sizes='(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw'
        className='aspect-square w-full rounded-2xl'
        grows={!!item.href}
      />
      <div
        className={cn(
          'z-1 -mt-6 grid content-start gap-4 rounded-2xl p-6 intent-neutral',
          emphasisClass(itemEmphasis ?? 'raised')
        )}
      >
        <Illustration name={item.illustration} className='-mt-16 size-16' />
        <Mark
          render={<h3 />}
          intent={cycledIntent(props)}
          className='text-display-prose-4'
        >
          <CardTitle item={item} />
        </Mark>
        <div className='grid gap-1'>
          {item.subtitle && (
            <p className='text-lg font-medium text-strong'>{item.subtitle}</p>
          )}
          {item.description && (
            <p className='text-subtle'>{item.description}</p>
          )}
        </div>
      </div>
    </li>
  )
}

function PortraitCard(props: CardProps) {
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
            intent={markIntent(props, 'info')}
            className='max-w-full truncate px-2 py-1 font-medium'
          >
            {item.subtitle}
          </Mark>
        )}
      </div>
    </li>
  )
}

function ListColumn({ item, itemEmphasis }: CardProps) {
  return (
    <li
      className={cn(
        rowSurface(item, itemEmphasis),
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
  /** The grid of cards. */
  list: string
  align?: BlockAlign
  /** The surface when `emphasis` is unset. */
  emphasis?: BlockEmphasis
  /** Keeps the surface inside the page's padding when `inset` is unset. */
  inset?: boolean
}

// Columns follow the block's own width, not the viewport's, so a block in a narrow layout stays narrow.
const LOOKS: Record<CardGridPreset, Look> = {
  cards: {
    Item: PlainCard,
    list: 'grid grid-cols-1 gap-12 @2xl:grid-cols-2 @4xl:grid-cols-3'
  },
  'marked-cards': {
    Item: ServiceCard,
    list: 'grid grid-cols-1 gap-12 @2xl:grid-cols-2 @7xl:grid-cols-4',
    align: 'center'
  },
  'overlap-cards': {
    Item: IndustryCard,
    list: 'grid grid-cols-1 gap-12 @2xl:grid-cols-2 @5xl:grid-cols-3',
    align: 'center'
  },
  portraits: {
    Item: PortraitCard,
    list: 'grid grid-cols-1 gap-8 @xl:grid-cols-2 @4xl:grid-cols-3 @6xl:grid-cols-4',
    align: 'start',
    emphasis: 'raised',
    inset: true
  },
  lists: {
    Item: ListColumn,
    list: 'grid grid-cols-[repeat(auto-fit,minmax(min(16rem,100%),1fr))] gap-8',
    align: 'start'
  }
}

// Steps fill four columns, and compact cards with no images fit two from a narrower width.
const NUMBERED_LIST =
  'grid grid-cols-1 gap-12 @2xl:grid-cols-2 @5xl:grid-cols-3 @7xl:grid-cols-4'
const COMPACT_LIST = 'grid grid-cols-1 gap-6 @xl:grid-cols-2 @4xl:grid-cols-3'

function listOf(
  name: CardGridPreset,
  items: readonly CardGridItem[],
  numbered: boolean
) {
  if (name !== 'cards') return LOOKS[name].list
  if (numbered) return NUMBERED_LIST
  return items.some((item) => item.image) ? LOOKS.cards.list : COMPACT_LIST
}

/** Like items, such as benefits, services, steps, contact options, values, or people, as cards in columns. */
export function CardGrid({
  preset,
  position,
  id,
  intent,
  emphasis,
  inset,
  itemEmphasis,
  align,
  size,
  numbered = false,
  eyebrow,
  title,
  titleHighlight,
  description,
  items,
  actions
}: CardGridProps) {
  const { name, variant } = presetOf(cardGridDefinition, preset)
  const look = LOOKS[name]
  const { Item } = look
  const ordered = name === 'cards' && numbered
  const headingAlign = align ?? look.align ?? 'center'
  const List = ordered ? 'ol' : 'ul'
  const headingId = useId()
  const markedEyebrow = name === 'overlap-cards' && eyebrow

  return (
    <BlockRoot
      block={cardGridDefinition.name}
      variant={variant}
      preset={name}
      position={position}
      id={id}
      intent={intent}
      aria-labelledby={headingId}
    >
      <BlockSurface
        emphasis={emphasis ?? look.emphasis}
        inset={inset ?? look.inset}
        className={cn(
          'grid grid-cols-1 wrap-anywhere',
          size === 'md' ? 'gap-8' : 'gap-12'
        )}
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
            id={headingId}
            eyebrow={markedEyebrow ? undefined : eyebrow}
            title={title}
            titleHighlight={titleHighlight}
            description={description}
            intent={intent}
            align={headingAlign}
            size={size}
            wide={headingAlign === 'start'}
            className='w-full'
          />
        </div>
        <List className={listOf(name, items, ordered)}>
          {items.map((item, index) => (
            <Item
              key={`${index}-${item.title}`}
              item={item}
              index={index}
              itemEmphasis={itemEmphasis}
              blockIntent={intent}
              numbered={ordered}
              centred={align === 'center'}
            />
          ))}
        </List>
        <BlockActions
          actions={actions}
          intent={intent}
          className={cn(headingAlign === 'center' && 'justify-center')}
        />
      </BlockSurface>
    </BlockRoot>
  )
}
