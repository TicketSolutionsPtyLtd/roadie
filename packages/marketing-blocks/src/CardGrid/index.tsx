import { type ReactNode, useId } from 'react'

import { Mark } from '@oztix/roadie-components/mark'
import { cn } from '@oztix/roadie-core/utils'

import type { BlockImage } from '../Provider'
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
  /** The card's heading, or a person's name in `team`. */
  title: string
  /** A short line under the title, or a person's role in `team`. */
  subtitle?: string
  /** Every preset but `team` and `lists` shows it. */
  description?: string
  /** Every preset but `lists` shows it. */
  image?: BlockImage
  /** Shown by `features`, `services`, and `industries`. */
  illustration?: SpotIllustrationName
  /** The list `lists` shows under the title. */
  points?: readonly string[]
}

export type CardGridProps = {
  /**
   * The look: `features`, `services`, `industries`, `team`, and `lists` are grids, and `values` is a list of alternating rows.
   * @default 'features'
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
}

type CardProps = { item: CardGridItem; index: number }

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
    <li className='@container/card grid items-center gap-8 @2xl/card:grid-cols-2'>
      <CardImage
        image={item.image}
        sizes='(min-width: 1024px) 33vw, 100vw'
        className='aspect-video w-full rounded-2xl'
      />
      <div className='grid justify-items-center gap-2 text-center @2xl/card:justify-items-start @2xl/card:text-start'>
        <Illustration
          name={item.illustration}
          className='relative -mt-20 size-20 @2xl/card:mt-0 @2xl/card:size-16'
        />
        <h3 className='text-display-prose-4 text-strong'>{item.title}</h3>
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
    <li className='grid min-w-0 content-start gap-6'>
      <CardImage
        image={item.image}
        sizes='(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw'
        className='aspect-video w-full rounded-2xl @3xl:aspect-4/3'
      />
      <div className='grid @3xl:pt-2'>
        <Mark
          render={<h3 />}
          intent='info'
          className='relative text-display-prose-4'
        >
          {item.title}
          <Illustration
            name={item.illustration}
            className='absolute -top-20 left-2 @3xl:-top-6 @3xl:-right-6 @3xl:left-auto'
          />
        </Mark>
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
    <li className='grid grid-rows-[auto_1fr]'>
      <CardImage
        image={item.image}
        sizes='(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw'
        className='aspect-square w-full rounded-2xl'
      />
      <div className='dark relative -mt-6 grid content-start gap-4 rounded-2xl bg-normal p-6 text-normal intent-neutral'>
        <Illustration name={item.illustration} className='-mt-16 size-16' />
        <Mark
          render={<h3 />}
          intent={markIntent(index)}
          className='text-display-prose-4'
        >
          {item.title}
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

function ValueRow({ item, index }: CardProps) {
  const imageFirst = index % 2 === 0
  return (
    <li
      className={cn(
        'grid items-start gap-x-12 gap-y-4 @3xl:items-center',
        imageFirst ? '@3xl:grid-cols-[2fr_3fr]' : '@3xl:grid-cols-[3fr_2fr]'
      )}
    >
      <div className='grid gap-4'>
        <div className='grid'>
          <Mark
            render={<h3 />}
            intent={markIntent(index)}
            className='px-3 text-display-prose-4'
          >
            {item.title}
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
          'aspect-square w-full max-w-80 rounded-3xl @3xl:max-w-none',
          imageFirst && '@3xl:-order-1'
        )}
      />
    </li>
  )
}

function TeamCard({ item }: CardProps) {
  return (
    <li className='dark relative grid aspect-square overflow-hidden rounded-2xl'>
      <CardImage
        image={item.image}
        sizes='(min-width: 1280px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw'
        className='absolute inset-0 size-full'
      />
      <div className='relative grid self-end p-4'>
        <Mark render={<h3 />} intent='neutral' className='text-display-ui-4'>
          {item.title}
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
    <li className='grid content-start gap-4'>
      <h3 className='text-display-prose-5 text-strong'>{item.title}</h3>
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
  Card: (props: CardProps) => ReactNode
  /** The grid or list of cards. */
  list: string
  align: 'center' | 'start'
  /** Sits the block on a raised surface. */
  raised?: boolean
}

// Columns follow the block's own width, not the viewport's, so a block in a narrow layout stays narrow.
const LOOKS: Record<CardGridPreset, Look> = {
  features: {
    Card: FeatureCard,
    list: 'grid gap-12 @5xl:grid-cols-3',
    align: 'center',
    raised: true
  },
  services: {
    Card: ServiceCard,
    list: 'grid gap-12 @3xl:grid-cols-2 @7xl:grid-cols-4',
    align: 'center'
  },
  industries: {
    Card: IndustryCard,
    list: 'grid gap-12 @3xl:grid-cols-2 @7xl:grid-cols-3',
    align: 'center'
  },
  values: { Card: ValueRow, list: 'grid gap-20', align: 'start' },
  team: {
    Card: TeamCard,
    list: 'grid gap-8 @xl:grid-cols-2 @3xl:grid-cols-3 @7xl:grid-cols-4',
    align: 'start',
    raised: true
  },
  lists: {
    Card: ListColumn,
    list: 'grid gap-8 @3xl:auto-cols-fr @3xl:grid-flow-col',
    align: 'start'
  }
}

/** Like items, such as benefits, services, values, or people, as cards in columns or alternating rows. */
export function CardGrid({
  preset,
  position,
  id,
  eyebrow,
  title,
  titleHighlight,
  description,
  items
}: CardGridProps) {
  const { name, variant } = presetOf(cardGridDefinition, preset)
  const { Card, list, align, raised } = LOOKS[name]
  const headingId = useId()
  const markedEyebrow = name === 'industries' && eyebrow

  return (
    <BlockRoot
      block={cardGridDefinition.name}
      variant={variant}
      preset={name}
      position={position}
      id={id}
      aria-labelledby={headingId}
      className={cn(raised && '@7xl:px-2')}
    >
      <div
        className={cn(
          'mx-auto grid w-full max-w-8xl gap-12 px-6 @3xl:px-8 @5xl:px-12',
          raised && 'bg-raised py-16 @5xl:py-20 @7xl:rounded-3xl'
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
        <ul className={list}>
          {items.map((item, index) => (
            <Card key={`${index}-${item.title}`} item={item} index={index} />
          ))}
        </ul>
      </div>
    </BlockRoot>
  )
}
