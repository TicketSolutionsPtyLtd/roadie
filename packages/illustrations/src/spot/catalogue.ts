import { componentName, labelOf } from './names'
import tags from './tags.json'

export type SpotIllustrationEntry = {
  /** The component's name, such as `ArrowUpRight`. */
  name: string
  /** The source's file name, such as `arrow-up-right`, at `spot/svgs/<slug>.svg`. */
  slug: string
  /** The name in words, such as `Arrow up right`. */
  label: string
  /** What it shows or suits, such as `growth` and `reporting`, for search. */
  tags: readonly string[]
}

/** Every spot illustration, by name, with its label and tags, for pickers and search. */
export const SPOT_ILLUSTRATIONS: readonly SpotIllustrationEntry[] =
  Object.entries(tags).map(([slug, entryTags]) => ({
    name: componentName(slug),
    slug,
    label: labelOf(slug),
    tags: entryTags
  }))
