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

/** The surface a block draws behind its content. Every block takes these; a CTA band adds `strong` and `inverted`. */
export type BlockEmphasis = 'subtler' | 'subtle' | 'normal' | 'raised'

/** The surface of every item in a block, such as its cards or questions. */
export type ItemEmphasis = BlockEmphasis

/** Every emphasis a surface can draw. */
export type SurfaceEmphasis = ItemEmphasis | 'strong' | 'inverted'

/** Where a block's heading and text line up. */
export type BlockAlign = 'start' | 'center'

/** How much room a block takes: each step down from the preset's `lg` sets a smaller title, smaller text, and tighter spacing. */
export type BlockSize = 'sm' | 'md' | 'lg'

/** Picks a block's value for its size, `lg` when unset. */
export function bySize<T>(
  size: BlockSize | undefined,
  values: Record<BlockSize, T>
): T {
  return values[size ?? 'lg']
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
