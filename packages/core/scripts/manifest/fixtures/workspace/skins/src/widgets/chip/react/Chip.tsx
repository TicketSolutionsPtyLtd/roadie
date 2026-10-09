export type ChipProps = {
  /** Text on the chip. */
  label: string
}

/** A removable filter chip. */
export function Chip({ label }: ChipProps) {
  return <span>{label}</span>
}
