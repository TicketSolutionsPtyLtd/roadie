'use client'

import * as React from 'react'

import {
  generateAccentScale,
  generateNeutralScale,
  getOklchChroma,
  getOklchHue
} from '@oztix/roadie-core/colors'

export { getThemeScript } from '@oztix/roadie-core/theme'

/**
 * The default Roadie accent colour (Oztix blue).
 * Consumers that need to reset the accent back to the default should
 * import this constant instead of hard-coding the hex.
 */
export const DEFAULT_ACCENT_COLOR = '#0091EB'

const THEME_STORAGE_KEY = 'theme'

const HEX_COLOR_PATTERN =
  /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

/**
 * Validate that a value is a CSS hex colour string (`#RGB`, `#RRGGBB`,
 * or `#RRGGBBAA`). Consumers can use this at their fetch boundary to
 * guard untrusted input before passing it to `ThemeProvider`.
 */
export function isValidHexColor(input: unknown): input is string {
  return typeof input === 'string' && HEX_COLOR_PATTERN.test(input)
}

/**
 * Thrown by `setAccentColor` and `getAccentStyleTagSync` when the input
 * is not a valid hex colour. Prefer wrapping the call in a try/catch
 * or validating up front with `isValidHexColor`.
 */
export class InvalidColorError extends Error {
  constructor(input: unknown) {
    super(
      `[Roadie] Invalid accent colour: ${JSON.stringify(
        input
      )}. Expected a hex string like "#0091EB".`
    )
    this.name = 'InvalidColorError'
  }
}

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
  isDark: boolean
  setDark: (dark: boolean) => void
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(
  undefined
)

export interface ThemeProviderProps {
  children: React.ReactNode
  /**
   * Controlled accent colour. When provided (including `null`), the
   * provider operates in controlled mode: this value overrides
   * internal state on every render and imperative `setAccentColor`
   * calls become no-ops with a dev warning. Pass `null` to opt into
   * controlled mode while falling back to `defaultAccentColor` (useful
   * for async data: `collection?.themeColour ?? null`).
   */
  accentColor?: string | null
  /**
   * Initial accent colour when uncontrolled. Ignored when the
   * `accentColor` prop is provided.
   */
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
 *
 * Async because it pulls in `colorjs.io` to compute the full 14-step
 * hex scale for non-OKLCH browsers. For pre-hydration bootstrap on
 * modern browsers, prefer `getAccentStyleTagSync`.
 */
export async function getAccentStyleTag(
  accentHex: string,
  id = 'roadie-accent-theme'
): Promise<string> {
  if (!isValidHexColor(accentHex)) {
    throw new InvalidColorError(accentHex)
  }
  const result = await generateAccentScale(accentHex)
  const neutral = await generateNeutralScale(accentHex)
  const hue = Math.round(await getOklchHue(accentHex))
  const chroma = +(await getOklchChroma(accentHex)).toFixed(4)

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

  const safeId = id.replace(/[<>"&]/g, '')
  return `<style id="${safeId}">
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

/**
 * Dev-mode check that works across consumer bundlers (Next.js, Vite,
 * Webpack, Rollup). See `CarouselRoot.tsx` for the full rationale —
 * `process.env.NODE_ENV` is replaced at build time by every mainstream
 * bundler, and the `typeof process` guard covers runtimes that haven't
 * shimmed `process` on the client.
 */
declare const process: { env?: { NODE_ENV?: string } } | undefined

function isDev(): boolean {
  return (
    typeof process !== 'undefined' && process?.env?.NODE_ENV !== 'production'
  )
}

// ---------------------------------------------------------------------------
// ThemeProvider
// ---------------------------------------------------------------------------

export function ThemeProvider({
  children,
  accentColor: controlledAccent,
  defaultAccentColor = DEFAULT_ACCENT_COLOR,
  defaultDark = false,
  followSystem = false
}: ThemeProviderProps) {
  const isControlled = controlledAccent !== undefined

  // Dev warning: switching between controlled/uncontrolled is almost
  // always a bug. Mirrors React's controlled-input convention.
  const wasControlled = React.useRef(isControlled)
  if (isDev() && wasControlled.current !== isControlled) {
    console.warn(
      `[Roadie] ThemeProvider is switching from ${
        wasControlled.current ? 'controlled' : 'uncontrolled'
      } to ${
        isControlled ? 'controlled' : 'uncontrolled'
      }. Decide once and stick with it — pass a stable \`accentColor\` prop or omit it entirely.`
    )
    wasControlled.current = isControlled
  }

  const [internalAccent, setInternalAccent] = React.useState(defaultAccentColor)

  // Resolve the effective accent colour. Controlled prop always wins.
  // Invalid controlled input falls back to defaultAccentColor with a warning.
  const accentColor = React.useMemo(() => {
    if (!isControlled) return internalAccent
    if (controlledAccent === null) return defaultAccentColor
    if (isValidHexColor(controlledAccent)) return controlledAccent
    if (isDev()) {
      console.warn(
        `[Roadie] Invalid accentColor passed to <ThemeProvider>: ${JSON.stringify(
          controlledAccent
        )}. Falling back to defaultAccentColor.`
      )
    }
    return defaultAccentColor
  }, [isControlled, controlledAccent, defaultAccentColor, internalAccent])

  const setAccentColor = React.useCallback(
    (next: string) => {
      if (!isValidHexColor(next)) {
        throw new InvalidColorError(next)
      }
      if (isControlled) {
        if (isDev()) {
          console.warn(
            '[Roadie] setAccentColor() was called on a controlled <ThemeProvider>. Update the `accentColor` prop instead — this call is a no-op.'
          )
        }
        return
      }
      setInternalAccent(next)
    },
    [isControlled]
  )

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
    let cancelled = false

    async function updateAccent() {
      const hue = Math.round(await getOklchHue(accentColor))
      const chroma = +(await getOklchChroma(accentColor)).toFixed(4)

      if (cancelled) return

      // Skip regeneration if existing style tag already has matching values
      const existing = document.getElementById('roadie-accent-theme')
      if (existing?.textContent?.includes(`--accent-hue: ${hue}`)) {
        return
      }

      let css: string

      if (supportsOklch) {
        css = `
          :root {
            --accent-hue: ${hue};
            --accent-chroma: ${chroma};
          }
        `
      } else {
        const result = await generateAccentScale(accentColor)
        const neutral = await generateNeutralScale(accentColor)

        if (cancelled) return

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
    }

    updateAccent()
    return () => {
      cancelled = true
    }
  }, [accentColor])

  const value = React.useMemo(
    () => ({ accentColor, setAccentColor, isDark, setDark }),
    [accentColor, setAccentColor, isDark, setDark]
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
