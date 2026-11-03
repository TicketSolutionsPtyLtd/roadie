import type { BlockAction, BlockImage } from '../Provider'

type Missing<T, Names extends readonly unknown[]> = Exclude<
  keyof T & string,
  Names[number]
>

/** Lists the fields inside an object: a name `T` lacks, or a field of `T` left out, fails to type-check. */
export function fieldsOf<T>() {
  return <const Names extends readonly (keyof T & string)[]>(
    names: Names &
      ([Missing<T, Names>] extends [never]
        ? unknown
        : { readonly missing: Missing<T, Names> })
  ): Names => names
}

/** The fields inside an image, wherever a block takes one. */
export const IMAGE_FIELDS = fieldsOf<BlockImage>()([
  'src',
  'alt',
  'width',
  'height',
  'blurDataURL'
])

/** The fields inside an action. */
export const ACTION_FIELDS = fieldsOf<BlockAction>()(['label', 'href', 'icon'])
