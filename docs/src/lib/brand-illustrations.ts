import { SPOT_ILLUSTRATIONS } from '@oztix/roadie-illustrations/spot/catalogue'

/** An illustration in the brand library: the SVG at `/brand/illustrations/{slug}.svg`. */
export type BrandIllustration = {
  slug: string
  label: string
  tags: readonly string[]
  /** The SpotIllustration component that draws it in apps. */
  component: string
}

// The illustrations package is the source; the docs only read it.
export const BRAND_ILLUSTRATIONS: BrandIllustration[] = SPOT_ILLUSTRATIONS.map(
  ({ slug, label, tags, name }) => ({ slug, label, tags, component: name })
)
