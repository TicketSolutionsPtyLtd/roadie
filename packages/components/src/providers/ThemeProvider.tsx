'use client'

import * as React from 'react'

import {
  generateAccentScale,
  generateNeutralScale,
  getAccentChromaSync,
  getOklchHueSync
} from '@oztix/roadie-core/colors'

import { AccentScopeContext } from './AccentScopeContext'

export { getBootstrapScript, getThemeScript } from '@oztix/roadie-core/theme'

/**
 * The default Roadie accent colour (Oztix blue).
 * Consumers that need to reset the accent back to the default should
 * import this constant instead of hard-coding the hex.
 */
export const DEFAULT_ACCENT_COLOR = '#0091EB'

const THEME_STORAGE_KEY = 'theme'

const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

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

export const ThemeContext = React.createContext<ThemeContextType | undefined>(
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
   * for async data: `collection?.themeColour ?? null`). Without a
   * `defaultAccentColor`, `null` falls back to the parent provider's
   * accent when nested, or to Oztix blue at the root.
   */
  accentColor?: string | null
  /**
   * Initial accent colour when uncontrolled, and the fallback for a
   * `null` or invalid `accentColor`. Defaults to the parent provider's
   * accent when nested, or to Oztix blue at the root.
   * @default #0091EB
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

const ACCENT_STYLE_ID = 'roadie-accent-theme'

function accentParams(accentHex: string) {
  return {
    hue: Math.round(getOklchHueSync(accentHex)),
    chroma: +getAccentChromaSync(accentHex).toFixed(4)
  }
}

/** The accent CSS with the full hex scales, for browsers without OKLCH. */
async function getAccentStyleWithFallbacks(accentHex: string) {
  const [accent, neutral] = await Promise.all([
    generateAccentScale(accentHex),
    generateNeutralScale(accentHex)
  ])
  const { hue, chroma } = accentParams(accentHex)
  const vars = (scale: string, hexes: string[]) =>
    hexes.map((hex, i) => `--color-${scale}-${i}: ${hex};`).join('\n    ')

  return `
  :root {
    --accent-hue: ${hue};
    --accent-chroma: ${chroma};
    ${vars('neutral', neutral.light)}
    ${vars('accent', accent.light)}
  }
  .dark {
    ${vars('neutral', neutral.dark)}
    ${vars('accent', accent.dark)}
  }
`
}

/** Whether a written accent style already holds this accent. */
function holdsAccent(css: string, accentHex: string) {
  const { hue, chroma } = accentParams(accentHex)
  const written = (name: string) =>
    Number(css.match(new RegExp(`--accent-${name}:\\s*(-?[\\d.]+)`))?.[1])
  return (
    written('hue') === hue &&
    written('chroma') === chroma &&
    (supportsOklch || css.includes('--color-accent-'))
  )
}

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
  id = ACCENT_STYLE_ID
): Promise<string> {
  if (!isValidHexColor(accentHex)) {
    throw new InvalidColorError(accentHex)
  }
  const css = await getAccentStyleWithFallbacks(accentHex)
  const safeId = id.replace(/[<>"&]/g, '')
  return `<style id="${safeId}">${css}</style>`
}

/**
 * Return only the inner CSS body (`:root{--accent-hue:…}`) for the
 * accent colour. Useful for React consumers that want to inject the
 * accent via `<style dangerouslySetInnerHTML>` without wrapping a
 * second `<style>` tag around the output of `getAccentStyleTagSync`.
 *
 * Throws `InvalidColorError` on invalid hex input.
 *
 * @example
 * ```tsx
 * <head>
 *   <style
 *     id="roadie-accent-theme"
 *     dangerouslySetInnerHTML={{ __html: getAccentStyleSync(accentHex) }}
 *   />
 * </head>
 * ```
 */
export function getAccentStyleSync(accentHex: string): string {
  if (!isValidHexColor(accentHex)) {
    throw new InvalidColorError(accentHex)
  }
  const { hue, chroma } = accentParams(accentHex)
  return `:root{--accent-hue:${hue};--accent-chroma:${chroma}}`
}

/**
 * Synchronous variant of `getAccentStyleTag` for pre-hydration bootstrap.
 *
 * Writes only `--accent-hue` and `--accent-chroma` — the two CSS custom
 * properties Roadie's OKLCH curves read. Modern browsers (Chrome 111+,
 * Safari 15.4+, Firefox 113+) support `oklch()` and get zero-flash
 * theming via this path. Non-OKLCH browsers continue to resolve the
 * full hex scale after hydration through `getAccentStyleTag`.
 *
 * Because this function is synchronous it can be called during SSR,
 * inside `getBootstrapScript`, or in a static-export layout that
 * injects its output into `<head>` before any stylesheet loads.
 *
 * Throws `InvalidColorError` on invalid hex input.
 */
export function getAccentStyleTagSync(
  accentHex: string,
  id = ACCENT_STYLE_ID
): string {
  const css = getAccentStyleSync(accentHex)
  const safeId = id.replace(/[<>"&]/g, '')
  return `<style id="${safeId}">${css}</style>`
}

// ---------------------------------------------------------------------------
// Dark mode helpers
// ---------------------------------------------------------------------------

// Roadie's own writes notify at once; the observer catches anyone else's.
const darkListeners = new Set<() => void>()

function applyDark(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  for (const listener of darkListeners) listener()
}

function readDarkClass() {
  return document.documentElement.classList.contains('dark')
}

function subscribeToDarkClass(onChange: () => void) {
  darkListeners.add(onChange)
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  })
  return () => {
    darkListeners.delete(onChange)
    observer.disconnect()
  }
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
  defaultAccentColor,
  defaultDark = false,
  followSystem = false
}: ThemeProviderProps) {
  const isControlled = controlledAccent !== undefined

  // A nested provider scopes its accent to a wrapper, so only the root
  // provider owns the document-wide style.
  const parent = React.useContext(ThemeContext)
  const nested = parent !== undefined
  const parentScope = React.useContext(AccentScopeContext)

  // Dev warning: switching between controlled/uncontrolled is almost
  // always a bug. Mirrors React's controlled-input convention.
  const wasControlled = React.useRef(isControlled)
  React.useEffect(() => {
    if (wasControlled.current === isControlled) return
    wasControlled.current = isControlled
    if (!isDev()) return
    console.warn(
      `[Roadie] ThemeProvider is switching from ${
        isControlled ? 'uncontrolled' : 'controlled'
      } to ${
        isControlled ? 'controlled' : 'uncontrolled'
      }. Decide once and stick with it — pass a stable \`accentColor\` prop or omit it entirely.`
    )
  }, [isControlled])

  const [internalAccent, setInternalAccent] = React.useState(defaultAccentColor)

  // Undefined when this provider has no accent of its own and inherits one.
  const ownAccent = React.useMemo(() => {
    if (!isControlled) return internalAccent
    if (controlledAccent === null) return defaultAccentColor
    if (isValidHexColor(controlledAccent)) return controlledAccent
    if (isDev()) {
      console.warn(
        `[Roadie] Invalid accentColor passed to <ThemeProvider>: ${JSON.stringify(
          controlledAccent
        )}. Falling back to defaultAccentColor, then the parent provider's accent, then Oztix blue.`
      )
    }
    return defaultAccentColor
  }, [isControlled, controlledAccent, defaultAccentColor, internalAccent])

  const accentColor = ownAccent ?? parent?.accentColor ?? DEFAULT_ACCENT_COLOR

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

  // The .dark class on <html> is the source of truth; the inline script may have set it before hydration.
  const isDark = React.useSyncExternalStore(
    subscribeToDarkClass,
    readDarkClass,
    () => defaultDark
  )

  React.useEffect(() => {
    const stored = getStoredTheme()
    if (stored) {
      applyDark(stored === 'dark')
      return
    }
    if (followSystem) {
      applyDark(window.matchMedia('(prefers-color-scheme: dark)').matches)
    }
  }, [followSystem])

  // Listen for OS preference changes when followSystem is true
  React.useEffect(() => {
    if (!followSystem) return

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      // Only follow system if user hasn't explicitly chosen
      if (getStoredTheme()) return
      applyDark(e.matches)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [followSystem])

  // Explicit toggle — persists to localStorage and applies to DOM
  const setDark = React.useCallback((dark: boolean) => {
    applyDark(dark)
    storeTheme(dark)
  }, [])

  React.useEffect(() => {
    if (nested) return
    const existing = document.getElementById(ACCENT_STYLE_ID)
    if (existing && holdsAccent(existing.textContent ?? '', accentColor)) return

    const write = (css: string) => {
      let style = document.getElementById(ACCENT_STYLE_ID)
      if (!style) {
        style = document.createElement('style')
        style.id = ACCENT_STYLE_ID
        document.head.appendChild(style)
      }
      style.textContent = css
    }

    if (supportsOklch) {
      write(getAccentStyleSync(accentColor))
      return
    }
    let cancelled = false
    getAccentStyleWithFallbacks(accentColor).then((css) => {
      if (!cancelled) write(css)
    })
    return () => {
      cancelled = true
    }
  }, [nested, accentColor])

  const value = React.useMemo(
    () => ({ accentColor, setAccentColor, isDark, setDark }),
    [accentColor, setAccentColor, isDark, setDark]
  )

  const scope = React.useMemo(() => {
    if (!nested || !ownAccent) return null
    const { hue, chroma } = accentParams(ownAccent)
    return {
      '--accent-hue': String(hue),
      '--accent-chroma': String(chroma)
    } as React.CSSProperties
  }, [nested, ownAccent])

  if (!nested) {
    return (
      <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    )
  }

  // The wrapper stays while the accent loads so the subtree doesn't remount.
  return (
    <ThemeContext.Provider value={value}>
      <AccentScopeContext.Provider value={scope ?? parentScope}>
        <div
          data-accent-scope={scope ? '' : undefined}
          className='contents'
          style={scope ?? undefined}
        >
          {children}
        </div>
      </AccentScopeContext.Provider>
    </ThemeContext.Provider>
  )
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
