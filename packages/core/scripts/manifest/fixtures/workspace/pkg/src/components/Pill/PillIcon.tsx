export type PillIconProps = {
  /** Phosphor icon name. */
  name: string
}

export function PillIcon(props: PillIconProps) {
  return props.name
}

export function PillInternal(props: { secret: string }) {
  return props.secret
}
