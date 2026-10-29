'use client'

import type { ReactNode } from 'react'

import { MarketingBlocksContext } from '../_shared/context'

export type { SpotIllustrationName } from '../_shared/illustrations'

/** An image a block shows, as a CMS or a static import gives it. */
export type BlockImage = {
  src: string
  alt: string
  width?: number
  height?: number
  /** A tiny blurred copy to show while the image loads, as static imports and CMS image metadata give one. */
  blurDataURL?: string
}

/** A link a block shows as a button. The first in a block is the strong one. */
export type BlockAction = {
  label: string
  href: string
  /** An icon that says where the link goes. `external` and `arrow-right` follow the label; the rest lead it. */
  icon?: BlockActionIcon
}

export type BlockActionIcon =
  | 'arrow-right'
  | 'calendar'
  | 'chat'
  | 'email'
  | 'external'
  | 'phone'

/** What a block reports: a view once half of it, or half the screen, shows it, or a click on a link or button inside it. */
export type BlockEvent = {
  action: 'view' | 'click'
  /** The block's name, such as `hero`. */
  block: string
  variant: string
  preset: string
  /** The block's place on the page, counting from 1. */
  position?: number
  /** The block's `id`, when it has one, so two blocks of one kind can be told apart. */
  id?: string
  /** A clicked link's or button's accessible name. */
  label?: string
  /** A clicked link's destination. */
  href?: string
}

export type RenderImageProps = BlockImage & {
  /** The `sizes` attribute for the block's layout. */
  sizes?: string
  /** True for an image above the fold, such as a hero's. */
  priority?: boolean
  className?: string
}

export type MarketingBlocksProviderProps = {
  /** Receives every block's view and click events, such as to send them to PostHog. */
  onBlockEvent?: (event: BlockEvent) => void
  /** Draws every block image, such as with `next/image` or a CMS image URL builder. Roadie's `Image` draws them by default. */
  renderImage?: (image: RenderImageProps) => ReactNode
  children?: ReactNode
}

/** Sends block events and draws block images for every block inside it. */
export function MarketingBlocksProvider({
  onBlockEvent,
  renderImage,
  children
}: MarketingBlocksProviderProps) {
  return (
    <MarketingBlocksContext value={{ onBlockEvent, renderImage }}>
      {children}
    </MarketingBlocksContext>
  )
}
