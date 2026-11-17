import {
  Heart,
  type SpotIllustrationComponentProps,
  type SpotIllustrationComponentProps as Shared
} from '@oztix/roadie-illustrations/spot'

export function Liked(props: SpotIllustrationComponentProps & Shared) {
  return <Heart {...props} />
}
