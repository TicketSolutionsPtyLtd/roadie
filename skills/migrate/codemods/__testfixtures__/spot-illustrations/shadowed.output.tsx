import { Heart, type SpotIllustrationComponentProps as HeartProps } from '@oztix/roadie-illustrations/spot'

export function Liked(props: HeartProps) {
  const HeartProps = { size: 1 }
  return <Heart {...props} data-size={HeartProps.size} />
}
