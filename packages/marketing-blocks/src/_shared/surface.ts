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

/** A Roadie emphasis preset for a block's surface or its cards. Each block allows the ones its content reads on. */
export type BlockEmphasis =
  | 'raised'
  | 'subtle'
  | 'subtler'
  | 'normal'
  | 'strong'
  | 'inverted'

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

const EMPHASIS_CLASS: Record<BlockEmphasis, string> = {
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

export function emphasisClass(emphasis: BlockEmphasis | undefined): string {
  return emphasis ? EMPHASIS_CLASS[emphasis] : ''
}
