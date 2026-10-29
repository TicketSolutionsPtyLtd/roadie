import { type ReactNode, useId } from 'react'

import { Card } from '@oztix/roadie-components/card'
import { Mark } from '@oztix/roadie-components/mark'
import { cn } from '@oztix/roadie-core/utils'

import type { BlockAction, BlockImage } from '../Provider'
import { BlockActions } from '../_shared/BlockActions'
import { BlockHeading } from '../_shared/BlockHeading'
import { BlockImg } from '../_shared/BlockImg'
import { BlockRoot } from '../_shared/BlockRoot'
import {
  SPOT_ILLUSTRATIONS,
  type SpotIllustrationName
} from '../_shared/illustrations'
import { presetOf } from '../_shared/presets'
import { cardGridDefinition } from './definition'

export type CardGridPreset = (typeof cardGridDefinition.presets)[number]['name']

export type CardGridItem = {
  /** The card's heading, or a person's name in `portraits`. */
  title: string
  /** A short line under the title, or a person's role in `portraits`. */
  subtitle?: string
  /** Every preset but `portraits` and `lists` shows it. */
  description?: string
  /** Every preset but `link-cards` and `lists` shows it. */
  image?: BlockImage
  /** Shown by `illustrated-cards`, `marked-cards`, `overlap-cards`, `numbered-cards`, and `link-cards`. */
  illustration?: SpotIllustrationName
  /** The list `lists` shows under the title. */
  points?: readonly string[]
  /** The item's own page. Its title becomes the link, and the whole card the place to click. */
  href?: string
}

export type CardGridProps = {
  /**
   * The look. `alternating-rows` is a list of rows; every other preset is a grid of cards, and `numbered-cards` numbers them.
   * @default 'illustrated-cards'
   */
  preset?: CardGridPreset
  /** The block's place on the page, counting from 1, reported with its events. */
  position?: number
  /** An id for linking to the block. */
  id?: string
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

type CardProps = { item: CardGridItem; index: number }

// The surface a linked card's title link covers. Nothing between them is positioned, so the link's overlay reaches the card's edges.
const CARD = 'is-interactive-within min-w-0'

function CardTitle({ item }: { item: CardGridItem }) {
  if (!item.href) return item.title
  return <Card.Link href={item.href}>{item.title}</Card.Link>
}

const MARK_CYCLE = ['info', 'brand', 'brand-secondary'] as const
const markIntent = (index: number) => MARK_CYCLE[index % MARK_CYCLE.length]

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
function CardImage({
  image,
  sizes,
  className
}: {
  image: BlockImage | undefined
  sizes: string
  className: string
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
          className='absolute inset-0 size-full object-cover'
        />
      )}
    </div>
  )
}

function FeatureCard({ item }: CardProps) {
  return (
    <li className={cn(CARD, 'grid content-start gap-8 rounded-2xl')}>
      <CardImage
        image={item.image}
        sizes='(min-width: 1024px) 33vw, 100vw'
        className='aspect-video w-full rounded-2xl'
      />
      <div className='grid justify-items-center gap-2 text-center'>
        <Illustration
          name={item.illustration}
          className='relative -mt-20 size-20'
        />
        <h3 className='text-display-prose-4 text-strong'>
          <CardTitle item={item} />
        </h3>
        {item.subtitle && (
          <p className='text-lg font-medium text-strong'>{item.subtitle}</p>
        )}
        {item.description && (
          <p className='text-lg text-subtle'>{item.description}</p>
        )}
      </div>
    </li>
  )
}

function ServiceCard({ item }: CardProps) {
  return (
    <li className={cn(CARD, 'grid min-w-0 content-start gap-6 rounded-2xl')}>
      <CardImage
        image={item.image}
        sizes='(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw'
        className='aspect-video w-full rounded-2xl @2xl:aspect-4/3'
      />
      <div className='grid @2xl:pt-2'>
        <div className='grid justify-self-start'>
          <Mark
            render={<h3 />}
            intent='info'
            className='col-start-1 row-start-1 text-display-prose-4'
          >
            <CardTitle item={item} />
          </Mark>
          <Illustration
            name={item.illustration}
            className='z-1 col-start-1 row-start-1 -mt-20 ml-2 self-start justify-self-start @2xl:-mt-6 @2xl:-mr-6 @2xl:ml-0 @2xl:justify-self-end'
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
    </li>
  )
}

function IndustryCard({ item, index }: CardProps) {
  return (
    <li className={cn(CARD, 'grid grid-rows-[auto_1fr] rounded-2xl')}>
      <CardImage
        image={item.image}
        sizes='(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw'
        className='aspect-square w-full rounded-2xl'
      />
      <div className='dark z-1 -mt-6 grid content-start gap-4 rounded-2xl bg-normal p-6 text-normal intent-neutral'>
        <Illustration name={item.illustration} className='-mt-16 size-16' />
        <Mark
          render={<h3 />}
          intent={markIntent(index)}
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

function AlternatingRow({ item, index }: CardProps) {
  const imageFirst = index % 2 === 0
  return (
    <li
      className={cn(
        CARD,
        'grid items-start gap-x-12 gap-y-4 rounded-3xl @xl:items-center',
        imageFirst
          ? '@xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]'
          : '@xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]'
      )}
    >
      <div className='grid gap-4'>
        <div className='grid'>
          <Mark
            render={<h3 />}
            intent={markIntent(index)}
            className='px-3 text-display-prose-4'
          >
            <CardTitle item={item} />
          </Mark>
          {item.subtitle && (
            <Mark
              render={<p />}
              intent='neutral'
              className='px-3 py-1 text-display-ui-5'
            >
              {item.subtitle}
            </Mark>
          )}
        </div>
        {item.description && (
          <p className='text-lg text-subtle'>{item.description}</p>
        )}
      </div>
      <CardImage
        image={item.image}
        sizes='(min-width: 768px) 40vw, 100vw'
        className={cn(
          'aspect-square w-full max-w-80 rounded-3xl @xl:max-w-none',
          imageFirst && '@xl:-order-1'
        )}
      />
    </li>
  )
}

function PortraitCard({ item }: CardProps) {
  return (
    <li
      className={cn(
        CARD,
        'dark relative grid aspect-square overflow-hidden rounded-2xl'
      )}
    >
      <CardImage
        image={item.image}
        sizes='(min-width: 1280px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw'
        className='absolute inset-0 size-full'
      />
      <div className='z-1 grid self-end p-4'>
        <Mark render={<h3 />} intent='neutral' className='text-display-ui-4'>
          <CardTitle item={item} />
        </Mark>
        {item.subtitle && (
          <Mark
            render={<p />}
            className='max-w-full truncate px-2 py-1 font-medium'
          >
            {item.subtitle}
          </Mark>
        )}
      </div>
    </li>
  )
}

function ListColumn({ item }: CardProps) {
  return (
    <li className={cn(CARD, 'grid content-start gap-4 rounded-2xl')}>
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

function StepCard({ item, index }: CardProps) {
  return (
    <li className={cn(CARD, 'grid content-start gap-4 rounded-2xl')}>
      {item.image && (
        <CardImage
          image={item.image}
          sizes='(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw'
          className='aspect-video w-full rounded-2xl'
        />
      )}
      <div className='flex items-end justify-between gap-4'>
        <Mark
          aria-hidden
          render={<span />}
          intent='brand-secondary'
          className='px-3 py-1 text-display-prose-2 tabular-nums'
        >
          {index + 1}
        </Mark>
        <Illustration name={item.illustration} className='size-12' />
      </div>
      <div className='grid gap-2'>
        <h3 className='text-display-prose-4 text-strong'>
          <CardTitle item={item} />
        </h3>
        {item.description && (
          <p className='text-lg text-subtle'>{item.description}</p>
        )}
      </div>
    </li>
  )
}

function LinkCard({ item }: CardProps) {
  return (
    <li
      className={cn(
        CARD,
        'grid content-start gap-4 rounded-2xl p-6 emphasis-raised'
      )}
    >
      <Illustration name={item.illustration} className='size-12' />
      <div className='grid gap-2'>
        <h3 className='text-display-prose-5 text-strong'>
          <CardTitle item={item} />
        </h3>
        {item.description && <p className='text-subtle'>{item.description}</p>}
      </div>
    </li>
  )
}

type Look = {
  Item: (props: CardProps) => ReactNode
  /** The grid or list of cards. */
  list: string
  align: 'center' | 'start'
  /** Sits the block on a raised surface. */
  raised?: boolean
  /** Numbers the cards, as an ordered list. */
  ordered?: boolean
  /** Keeps the raised surface inside the page's padding, rounded at every width. */
  inset?: boolean
}

const PAGE_PADDING = 'px-6 @3xl:px-8 @5xl:px-12'

// Columns follow the block's own width, not the viewport's, so a block in a narrow layout stays narrow.
const LOOKS: Record<CardGridPreset, Look> = {
  'illustrated-cards': {
    Item: FeatureCard,
    list: 'grid grid-cols-1 gap-12 @2xl:grid-cols-2 @4xl:grid-cols-3',
    align: 'center',
    raised: true
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
  'numbered-cards': {
    Item: StepCard,
    list: 'grid grid-cols-1 gap-12 @2xl:grid-cols-2 @5xl:grid-cols-3 @7xl:grid-cols-4',
    align: 'center',
    ordered: true
  },
  'link-cards': {
    Item: LinkCard,
    list: 'grid grid-cols-1 gap-6 @xl:grid-cols-2 @4xl:grid-cols-3',
    align: 'center'
  },
  'alternating-rows': {
    Item: AlternatingRow,
    list: 'grid grid-cols-1 gap-20',
    align: 'start'
  },
  portraits: {
    Item: PortraitCard,
    list: 'grid grid-cols-1 gap-8 @xl:grid-cols-2 @4xl:grid-cols-3 @6xl:grid-cols-4',
    align: 'start',
    raised: true,
    inset: true
  },
  lists: {
    Item: ListColumn,
    list: 'grid grid-cols-1 gap-8 @xl:grid-cols-2 @4xl:auto-cols-[minmax(0,1fr)] @4xl:grid-flow-col @4xl:grid-cols-none',
    align: 'start'
  }
}

/** Like items, such as benefits, services, steps, contact options, values, or people, as cards in columns or alternating rows. */
export function CardGrid({
  preset,
  position,
  id,
  eyebrow,
  title,
  titleHighlight,
  description,
  items,
  actions
}: CardGridProps) {
  const { name, variant } = presetOf(cardGridDefinition, preset)
  const { Item, list, align, raised, ordered, inset } = LOOKS[name]
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
      aria-labelledby={headingId}
      className={cn(inset ? PAGE_PADDING : raised && '@7xl:px-2')}
    >
      <div
        className={cn(
          'mx-auto grid w-full max-w-8xl grid-cols-1 gap-12',
          PAGE_PADDING,
          raised && 'bg-raised py-16 @5xl:py-20 @7xl:rounded-3xl',
          inset && 'rounded-3xl px-6 py-8 @3xl:px-8 @3xl:py-12'
        )}
      >
        <div className='grid justify-items-center gap-4'>
          {markedEyebrow && (
            <Mark
              render={<p />}
              intent='brand-secondary'
              className='justify-self-center px-2 py-1 text-display-prose-5'
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
            align={align}
            wide={align === 'start'}
            className='w-full'
          />
        </div>
        <List className={list}>
          {items.map((item, index) => (
            <Item key={`${index}-${item.title}`} item={item} index={index} />
          ))}
        </List>
        <BlockActions
          actions={actions}
          className={cn(align === 'center' && 'justify-center')}
        />
      </div>
    </BlockRoot>
  )
}
