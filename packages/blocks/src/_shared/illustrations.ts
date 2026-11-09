import {
  ArrowUpRight,
  CowboyHat,
  Cursor,
  FlowerSpiral,
  Football,
  Hand,
  Heart,
  HighFive,
  MapPin,
  NoteMusic,
  Ticket,
  WineGlass
} from '@oztix/roadie-components/spot-illustrations'

/** Every spot illustration a block can show, by its export name. */
export const SPOT_ILLUSTRATIONS = {
  ArrowUpRight,
  CowboyHat,
  Cursor,
  FlowerSpiral,
  Football,
  Hand,
  Heart,
  HighFive,
  MapPin,
  NoteMusic,
  Ticket,
  WineGlass
}

/** A spot illustration's name, such as `Ticket` or `MapPin`, as a CMS stores it. */
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
