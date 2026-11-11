import {
  Heart,
  SpotIllustration,
  createSpotIllustration
} from '@oztix/roadie-components/spot-illustrations'

import { art } from './art'

export const Custom = createSpotIllustration(art, 'Custom')

export function Pair() {
  return (
    <>
      <Heart />
      <SpotIllustration illustration={art} />
    </>
  )
}
