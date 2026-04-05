'use client'

import * as React from 'react'

import {
  type ScaleResult,
  generateAccentScale,
  generateNeutralScale,
  getOklchChroma,
  getOklchHue
} from '@oztix/roadie-core/colors'

export { getThemeScript } from '@oztix/roadie-core/theme'

const DEFAULT_ACCENT = '#0091EB' // Oztix Blue
const THEME_STORAGE_KEY = 'theme'

const supportsOklch =
  typeof CSS !== 'undefined' &&
  typeof CSS.supports === 'function' &&
  CSS.supports('color', 'oklch(0 0 0)')

// ---------------------------------------------------------------------------
// Theme context (accent color + dark mode)
// ---------------------------------------------------------------------------

interface ThemeContextType {
  accentColor: string
  setAccentColor: (color: string) => void
  scaleResult: ScaleResult | null
  isDark: boolean
  setDark: (dark: boolean) => void
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(
  undefined
)

export interface ThemeProviderProps {
  children: React.ReactNode
  defaultAccentColor?: string
  /** Initial dark mode state when no stored preference exists (default: false) */
  defaultDark?: boolean
  /** Respect prefers-color-scheme when no explicit user choice is stored (default: false) */
  followSystem?: boolean
}

// ---------------------------------------------------------------------------
// SSR helpers
// ---------------------------------------------------------------------------

/**
 * Generate a <style> tag string for server-side rendering.
 * Sets --accent-hue and --accent-chroma for CSS-native theming,
 * plus hex fallbacks for older browsers.
 */
export function getAccentStyleTag(
  accentHex: string,
  id = 'roadie-accent-theme'
): string {
  const result = generateAccentScale(accentHex)
  const neutral = generateNeutralScale(accentHex)
  const hue = Math.round(getOklchHue(accentHex))
  const chroma = +getOklchChroma(accentHex).toFixed(4)

  // Hex fallbacks for accent (non-oklch browsers)
  const accentVars = result.light
    .map((hex, i) => `--color-accent-${i}: ${hex};`)
    .join('\n    ')
  const darkAccentVars = result.dark
    .map((hex, i) => `--color-accent-${i}: ${hex};`)
    .join('\n    ')
  // Hex fallbacks for neutral (non-oklch browsers)
  const neutralVars = neutral.light
    .map((hex, i) => `--color-neutral-${i}: ${hex};`)
    .join('\n    ')
  const darkNeutralVars = neutral.dark
    .map((hex, i) => `--color-neutral-${i}: ${hex};`)
    .join('\n    ')

  return `<style id="${id}">
  :root {
    --accent-hue: ${hue};
    --accent-chroma: ${chroma};
    ${neutralVars}
    ${accentVars}
  }
  .dark {
    ${darkNeutralVars}
    ${darkAccentVars}
  }
</style>`
}

// ---------------------------------------------------------------------------
// Dark mode helpers
// ---------------------------------------------------------------------------

function applyDark(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
}

function getStoredTheme(): string | null {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY)
  } catch {
    return null
  }
}

function storeTheme(dark: boolean) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, dark ? 'dark' : 'light')
  } catch {
    // localStorage unavailable
  }
}

// ---------------------------------------------------------------------------
// ThemeProvider
// ---------------------------------------------------------------------------

export function ThemeProvider({
  children,
  defaultAccentColor = DEFAULT_ACCENT,
  defaultDark = false,
  followSystem = false
}: ThemeProviderProps) {
  const [accentColor, setAccentColor] = React.useState(defaultAccentColor)
  const [scaleResult, setScaleResult] = React.useState<ScaleResult | null>(null)

  // Initialise dark mode from prop — inline script may have already set .dark
  const [isDark, setIsDarkState] = React.useState(defaultDark)

  // Sync with DOM on mount
  React.useEffect(() => {
    const stored = getStoredTheme()
    if (stored) {
      setIsDarkState(stored === 'dark')
      return
    }

    // No stored preference — check OS preference or DOM state
    if (followSystem) {
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches
      setIsDarkState(prefersDark)
      applyDark(prefersDark)
    } else {
      const domDark = document.documentElement.classList.contains('dark')
      setIsDarkState(domDark)
    }
  }, []) // mount-only: followSystem/defaultDark are expected to be static

  // Listen for OS preference changes when followSystem is true
  React.useEffect(() => {
    if (!followSystem) return

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      // Only follow system if user hasn't explicitly chosen
      if (getStoredTheme()) return
      setIsDarkState(e.matches)
      applyDark(e.matches)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [followSystem])

  // Explicit toggle — persists to localStorage and applies to DOM
  const setDark = React.useCallback((dark: boolean) => {
    setIsDarkState(dark)
    applyDark(dark)
    storeTheme(dark)
  }, [])

  // Accent color effect — skip if SSR already injected matching values
  React.useEffect(() => {
    const hue = Math.round(getOklchHue(accentColor))
    const chroma = +getOklchChroma(accentColor).toFixed(4)

    // Skip regeneration if existing style tag already has matching values
    const existing = document.getElementById('roadie-accent-theme')
    if (existing?.textContent?.includes(`--accent-hue: ${hue}`)) {
      return
    }

    const result = generateAccentScale(accentColor)
    setScaleResult(result)

    let css: string

    if (supportsOklch) {
      css = `
        :root {
          --accent-hue: ${hue};
          --accent-chroma: ${chroma};
        }
      `
    } else {
      const neutral = generateNeutralScale(accentColor)
      const accentVars = result.light
        .map((hex, i) => `--color-accent-${i}: ${hex};`)
        .join('\n')
      const darkAccentVars = result.dark
        .map((hex, i) => `--color-accent-${i}: ${hex};`)
        .join('\n')
      const neutralVars = neutral.light
        .map((hex, i) => `--color-neutral-${i}: ${hex};`)
        .join('\n')
      const darkNeutralVars = neutral.dark
        .map((hex, i) => `--color-neutral-${i}: ${hex};`)
        .join('\n')

      css = `
        :root {
          ${neutralVars}
          ${accentVars}
        }
        .dark {
          ${darkNeutralVars}
          ${darkAccentVars}
        }
      `
    }

    let style = document.getElementById('roadie-accent-theme')
    if (!style) {
      style = document.createElement('style')
      style.id = 'roadie-accent-theme'
      document.head.appendChild(style)
    }
    style.textContent = css
  }, [accentColor])

  const value = React.useMemo(
    () => ({ accentColor, setAccentColor, scaleResult, isDark, setDark }),
    [accentColor, scaleResult, isDark, setDark]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useTheme() {
  const context = React.useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
