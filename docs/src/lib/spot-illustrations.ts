import * as SpotIllustrations from '@oztix/roadie-illustrations/spot'

const NOT_ILLUSTRATIONS = new Set(['SpotIllustration'])

/** Every spot illustration the package exports, by name, for the gallery and its markdown twin. */
export const SPOT_ILLUSTRATION_NAMES = (
  Object.keys(SpotIllustrations) as (keyof typeof SpotIllustrations)[]
)
  .filter((name) => !name.includes('Props') && !NOT_ILLUSTRATIONS.has(name))
  .sort((a, b) => a.localeCompare(b))
