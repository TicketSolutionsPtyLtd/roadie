export type ProviderProps = {
  /** Theme to start in. */
  theme?: 'light' | 'dark'
}

export function Provider(props: ProviderProps) {
  return props.theme
}
