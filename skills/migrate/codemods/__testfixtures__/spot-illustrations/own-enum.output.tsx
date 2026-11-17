import { Heart, type SpotIllustrationComponentProps as HeartProps } from '@oztix/roadie-illustrations/spot'

enum SpotIllustrationComponentProps {
  Small
}

export function Liked(props: HeartProps) {
  return <Heart {...props} data-size={SpotIllustrationComponentProps.Small} />
}
