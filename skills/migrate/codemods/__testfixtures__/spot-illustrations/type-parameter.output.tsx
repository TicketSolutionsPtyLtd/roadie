import { Heart, type SpotIllustrationComponentProps as HeartProps } from '@oztix/roadie-illustrations/spot'

export function Liked<SpotIllustrationComponentProps>(
  props: HeartProps,
  extra: SpotIllustrationComponentProps
) {
  return <Heart {...props} data-extra={String(extra)} />
}
