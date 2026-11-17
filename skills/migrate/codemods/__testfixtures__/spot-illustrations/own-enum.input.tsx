import { Heart, type HeartProps } from '@oztix/roadie-components/spot-illustrations'

enum SpotIllustrationComponentProps {
  Small
}

export function Liked(props: HeartProps) {
  return <Heart {...props} data-size={SpotIllustrationComponentProps.Small} />
}
