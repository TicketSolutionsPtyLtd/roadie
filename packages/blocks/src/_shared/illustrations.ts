import * as spot from '@oztix/roadie-illustrations/spot'

// Saved content names its illustration, so any of them can be asked for and none can be
// left out of the bundle. `SpotIllustration` is the base that draws them, not one of them.
const withoutBase = ({ SpotIllustration: _base, ...drawn }: typeof spot) =>
  drawn

/** Every spot illustration a block can show, by its export name. */
export const SPOT_ILLUSTRATIONS = withoutBase(spot)

/**
 * Any spot illustration's name, such as `Ticket` or `Number1`, as a CMS stores it. A picker
 * lists them, with labels and tags, from `@oztix/roadie-illustrations/spot/catalogue`.
 */
export type SpotIllustrationName = keyof typeof SPOT_ILLUSTRATIONS

type SpotIllustration = (typeof SPOT_ILLUSTRATIONS)[SpotIllustrationName]

const isSpotIllustration = (name: unknown): name is SpotIllustrationName =>
  typeof name === 'string' && Object.hasOwn(SPOT_ILLUSTRATIONS, name)

/**
 * The spot illustration a block names, or `fallback`'s when the name is none
 * of them. Saved content is untrusted, and a prototype key such as
 * `constructor` isn't an illustration.
 */
export function spotIllustration(
  name: unknown,
  fallback: SpotIllustrationName
): SpotIllustration
export function spotIllustration(name: unknown): SpotIllustration | undefined
export function spotIllustration(
  name: unknown,
  fallback?: SpotIllustrationName
): SpotIllustration | undefined {
  if (isSpotIllustration(name)) return SPOT_ILLUSTRATIONS[name]
  return fallback && SPOT_ILLUSTRATIONS[fallback]
}
