import { isOwnKey } from './ownKey'

/** A Roadie intent a block or card can set. Children inherit it through the cascade. */
export type BlockIntent =
  | 'neutral'
  | 'brand'
  | 'brand-secondary'
  | 'brand-purple'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'

/** The surface of every item in a block, such as its cards or questions. */
export type ItemEmphasis = 'subtler' | 'subtle' | 'normal' | 'raised'

/** The surface a block draws behind its content. On `strong` and `inverted`, the block's text takes the fill's own colour. */
export type BlockEmphasis = ItemEmphasis | 'strong' | 'inverted'

/** Every emphasis a surface can draw. */
export type SurfaceEmphasis = BlockEmphasis

/** A surface filled solid, where text takes the fill's own colour instead of the page's. */
export type FilledEmphasis = Extract<BlockEmphasis, 'strong' | 'inverted'>

export const isFilled = (
  emphasis: SurfaceEmphasis | null | undefined
): emphasis is FilledEmphasis =>
  emphasis === 'strong' || emphasis === 'inverted'

/** An image slot's shape: `story` (9:16), `portrait` (3:4), `square`, `landscape` (3:2), or `banner` (2:1). Video keeps 16:9. */
export type BlockRatio =
  | 'story'
  | 'portrait'
  | 'square'
  | 'landscape'
  | 'banner'

// Literal class names, so Tailwind finds them.
export const ratioClass: Record<BlockRatio, string> = {
  story: 'aspect-9/16',
  portrait: 'aspect-3/4',
  square: 'aspect-square',
  landscape: 'aspect-3/2',
  banner: 'aspect-2/1'
}

/** Where a block's heading and text line up. */
export type BlockAlign = 'start' | 'center'

/** How much room a block takes: each step down from the preset's `lg` sets a smaller title, smaller text, and tighter spacing. */
export type BlockSize = 'sm' | 'md' | 'lg'

/** Picks a block's value for its size, `lg` when unset or saved as no size. */
export function bySize<T>(
  size: BlockSize | undefined,
  values: Record<BlockSize, T>
): T {
  return values[isOwnKey(values, size) ? size : 'lg']
}

// Literal class names, so Tailwind finds them. Each step down a size closes the gap a step.
const GAP = {
  tight: { sm: 'gap-2', md: 'gap-3', lg: 'gap-4' },
  snug: { sm: 'gap-3', md: 'gap-4', lg: 'gap-6' },
  normal: { sm: 'gap-4', md: 'gap-6', lg: 'gap-8' },
  loose: { sm: 'gap-6', md: 'gap-8', lg: 'gap-12' },
  wide: { sm: 'gap-8', md: 'gap-10', lg: 'gap-16' },
  wider: { sm: 'gap-8', md: 'gap-12', lg: 'gap-20' }
} as const satisfies Record<string, Record<BlockSize, string>>

/** A spacing step between a block's parts. */
export type BlockGap = keyof typeof GAP

/** The gap class for a spacing step at a block's size. */
export function gapOf(size: BlockSize | undefined, gap: BlockGap): string {
  return bySize(size, GAP[gap])
}

// Literal class names, so Tailwind finds them in this file.
const INTENT_CLASS: Record<BlockIntent, string> = {
  neutral: 'intent-neutral',
  brand: 'intent-brand',
  'brand-secondary': 'intent-brand-secondary',
  'brand-purple': 'intent-brand-purple',
  accent: 'intent-accent',
  info: 'intent-info',
  success: 'intent-success',
  warning: 'intent-warning',
  danger: 'intent-danger'
}

const EMPHASIS_CLASS: Record<SurfaceEmphasis, string> = {
  raised: 'emphasis-raised',
  subtle: 'emphasis-subtle',
  subtler: 'emphasis-subtler',
  normal: 'emphasis-normal',
  strong: 'emphasis-strong',
  inverted: 'emphasis-inverted'
}

export function intentClass(intent: BlockIntent | undefined): string {
  return intent ? INTENT_CLASS[intent] : ''
}

export function emphasisClass(emphasis: SurfaceEmphasis | undefined): string {
  return emphasis ? EMPHASIS_CLASS[emphasis] : ''
}
