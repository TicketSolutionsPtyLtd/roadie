import { Heart, type HeartProps } from '@oztix/roadie-components/spot-illustrations'

export function Liked(props: HeartProps) {
  const HeartProps = { size: 1 }
  return <Heart {...props} data-size={HeartProps.size} />
}
