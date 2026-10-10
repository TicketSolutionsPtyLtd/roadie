import * as SpotIllustrations from '@oztix/roadie-components/spot-illustrations'

const NOT_ILLUSTRATIONS = new Set([
  'SpotIllustration',
  'createSpotIllustration'
])

/** Every spot illustration the package exports, by name, for the gallery and its markdown twin. */
export const SPOT_ILLUSTRATION_NAMES = Object.keys(SpotIllustrations)
  .filter((name) => !name.includes('Props') && !NOT_ILLUSTRATIONS.has(name))
  .sort((a, b) => a.localeCompare(b))
