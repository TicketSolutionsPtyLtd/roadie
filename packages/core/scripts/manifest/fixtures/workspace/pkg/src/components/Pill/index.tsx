import type { PlacesOptions } from '../../../../core/src/places'
import { PillIcon } from './PillIcon'

export type { PillIconFrame } from './PillIcon'

export type PillSize = 'sm' | 'lg'

/** A count or word shown on the pill. */
export type PillBadge = {
  /** The badge's text. */
  text: string
  /** Colour of the badge. */
  tone?: 'neutral' | 'danger'
  /** Shown on large pills only. */
  from?: 'lg'
  size?: PillSize
}

type PillNote = { text: string }

/** A row of the pill's menu. */
export type PillItem = {
  label: string
  /** The item's badge. */
  badge: PillBadge
  /** A note for the item's author. */
  note?: PillNote
}

export type PillProps = PlacesOptions & {
  /**
   * Colour of the pill.
   * @default 'neutral'
   */
  tone?: 'neutral' | 'danger'
  /**
   * Scales the pill.
   * @deprecated Use `size` instead,
   * which follows the shape tiers.
   */
  scale?: number
  label: string
  /** A badge after the label. */
  badge?: PillBadge
  /** The pill's menu. */
  items?: readonly PillItem[]
}

/** A small rounded label. */
export function Pill(props: PillProps) {
  return props.label
}

Pill.Root = Pill
Pill.Icon = PillIcon

/** @deprecated Use `Pill`. */
export function Tag(props: PillProps) {
  return props.label
}
