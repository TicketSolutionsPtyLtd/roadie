import { Heart, type HeartProps } from '@oztix/roadie-components/spot-illustrations'

type SpotIllustrationComponentProps = { label: string }

export function Liked(props: HeartProps & SpotIllustrationComponentProps) {
  return <Heart aria-label={props.label} />
}
