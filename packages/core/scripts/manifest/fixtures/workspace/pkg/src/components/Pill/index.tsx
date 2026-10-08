import { PillIcon } from './PillIcon'

export type PillProps = {
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
