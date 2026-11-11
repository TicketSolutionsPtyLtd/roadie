import { Heart, type HeartProps } from '@oztix/roadie-components/spot-illustrations'

export function Liked<SpotIllustrationComponentProps>(
  props: HeartProps,
  extra: SpotIllustrationComponentProps
) {
  return <Heart {...props} data-extra={String(extra)} />
}
