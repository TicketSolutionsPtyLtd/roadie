import {
  Heart,
  type HeartProps,
  type SpotIllustrationComponentProps as Shared
} from '@oztix/roadie-components/spot-illustrations'

export function Liked(props: HeartProps & Shared) {
  return <Heart {...props} />
}
