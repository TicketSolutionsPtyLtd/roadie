'use client'

import { type CSSProperties, createContext, useContext } from 'react'

/** The nearest nested `ThemeProvider`'s accent variables; `null` outside one. */
export const AccentScopeContext = createContext<CSSProperties | null>(null)
AccentScopeContext.displayName = 'AccentScopeContext'

type StyleProp<State> =
  CSSProperties | ((state: State) => CSSProperties | undefined) | undefined

/**
 * Props that carry a nested `ThemeProvider`'s accent onto a portal, which
 * renders outside the provider's wrapper. Empty outside a nested provider.
 */
export function useAccentScopeProps<State>(style: StyleProp<State>): {
  'data-accent-scope'?: ''
  style?: StyleProp<State>
} {
  const scope = useContext(AccentScopeContext)
  if (!scope) return {}
  return {
    'data-accent-scope': '',
    style:
      typeof style === 'function'
        ? (state: State) => ({ ...scope, ...style(state) })
        : { ...scope, ...style }
  }
}
