import { Heart, type SpotIllustrationComponentProps as HeartProps } from '@oztix/roadie-illustrations/spot'

type SpotIllustrationComponentProps = { label: string }

export function Liked(props: HeartProps & SpotIllustrationComponentProps) {
  return <Heart aria-label={props.label} />
}
