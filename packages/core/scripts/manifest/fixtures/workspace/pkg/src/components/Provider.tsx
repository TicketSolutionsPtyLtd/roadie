export type ProviderProps = {
  /** Theme to start in. */
  theme?: 'light' | 'dark'
}

export function Provider(props: ProviderProps) {
  return props.theme
}

/** Theme the provider starts in. */
export const DEFAULT_THEME = 'light'

/** Thrown for an unknown theme. */
export class ThemeError extends Error {}

/** Reads the current theme. */
export function useTheme() {
  return DEFAULT_THEME
}
