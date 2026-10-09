export type PillIconProps = {
  /** Phosphor icon name. */
  name: string
  /** Swatch the icon is drawn for. */
  theme?: 'dark' | 'light'
}

export function PillIcon(props: PillIconProps) {
  return props.name
}

export function PillInternal(props: { secret: string }) {
  return props.secret
}
