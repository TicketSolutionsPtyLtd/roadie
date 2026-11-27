// What `./spot/load` resolves to on a server, where bytes don't matter: the
// whole set, so a server render draws every illustration without waiting.
import type { SpotIllustrationComponent, SpotIllustrationName } from './load'
import * as spot from './set'

export {
  isSpotIllustrationName,
  type SpotIllustrationComponent,
  type SpotIllustrationName
} from './load'

export const loadedSpotIllustration = (
  name: SpotIllustrationName
): SpotIllustrationComponent => spot[name]

export const loadSpotIllustration = async (
  name: SpotIllustrationName
): Promise<SpotIllustrationComponent> => spot[name]
