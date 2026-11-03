import type { BlockAction, BlockImage } from '../Provider'

/** The fields inside an image, wherever a block takes one. */
export const IMAGE_FIELDS = [
  'src',
  'alt',
  'width',
  'height',
  'blurDataURL'
] as const satisfies readonly (keyof BlockImage)[]

/** The fields inside an action. */
export const ACTION_FIELDS = [
  'label',
  'href',
  'icon'
] as const satisfies readonly (keyof BlockAction)[]
