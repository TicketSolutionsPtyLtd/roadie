import {
  getOklchChromaSync,
  getOklchHueSync
} from '../colors/srgb-to-oklch'

const THEME_STORAGE_KEY = 'theme'
const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

/**
 * Generate a blocking inline script for SSR that prevents flash of wrong theme.
 * Place in <head> before any stylesheets.
 *
 * Works with any framework — returns a plain string with no dependencies.
 *
 * @example
 * // Next.js (React)
 * <script dangerouslySetInnerHTML={{ __html: getThemeScript({ followSystem: true }) }} />
 *
 * // Nuxt (Vue)
 * useHead({ script: [{ innerHTML: getThemeScript({ followSystem: true }) }] })
 *
 * // Plain HTML
 * <script>${getThemeScript()}</script>
 */
export function getThemeScript(options?: {
  /** Start in dark mode when no stored preference exists (default: false) */
  defaultDark?: boolean
  /** Fall back to OS preference when no stored preference exists (default: false) */
  followSystem?: boolean
}): string {
  const defaultTheme = options?.defaultDark ? 'dark' : 'light'
  const systemFallback = options?.followSystem
    ? "(window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light')"
    : `'${defaultTheme}'`
  return `try{var t=localStorage.getItem('${THEME_STORAGE_KEY}')||${systemFallback};var d=document.documentElement;d.classList.toggle('dark',t==='dark');d.style.colorScheme=t==='dark'?'dark':'light'}catch(e){}`
}

/**
 * Unified pre-hydration bootstrap combining the dark-mode toggle script
 * and the accent-colour style tag into a single string ready for
 * injection into `<head>`.
 *
 * For apps that only need dark-mode prevention, call `getThemeScript`
 * directly. For apps themed by data fetched on the server (per-tenant
 * branding, feature flags), pass the accent hex as `accentColor` and
 * Roadie will emit a synchronous `<style>` tag that sets
 * `--accent-hue` and `--accent-chroma` before the first paint.
 *
 * The combined output is framework-agnostic — inject it verbatim
 * inside `<head>` via Next's `dangerouslySetInnerHTML`, Astro's
 * `set:html`, or plain HTML.
 *
 * Modern browsers (Chrome 111+, Safari 15.4+, Firefox 113+) render the
 * accent curves from `oklch()` math, so the two custom properties are
 * sufficient for a zero-flash cold load. Older browsers fall back to
 * the default CSS accent until the client-side accent effect runs.
 *
 * @example
 * ```tsx
 * // Next.js layout.tsx
 * <head>
 *   <script
 *     dangerouslySetInnerHTML={{
 *       __html: getBootstrapScript({
 *         followSystem: true,
 *         accentColor: collection?.themeColour
 *       })
 *     }}
 *   />
 * </head>
 * ```
 *
 * @throws Error when `accentColor` is provided but not a valid hex.
 */
export function getBootstrapScript(options?: {
  defaultDark?: boolean
  followSystem?: boolean
  /**
   * Pre-resolved accent hex. When provided, emits a synchronous
   * `<style>` tag setting `--accent-hue` and `--accent-chroma`. When
   * omitted or null, the bootstrap only handles dark mode.
   */
  accentColor?: string | null
}): string {
  const themePart = `<script>${getThemeScript(options)}</script>`
  const accent = options?.accentColor
  if (!accent) return themePart
  if (!HEX_COLOR_PATTERN.test(accent)) {
    throw new Error(
      `[Roadie] getBootstrapScript: Invalid accentColor ${JSON.stringify(
        accent
      )}. Expected a hex string like "#0091EB".`
    )
  }
  const hue = Math.round(getOklchHueSync(accent))
  const chroma = +getOklchChromaSync(accent).toFixed(4)
  const accentPart = `<style id="roadie-accent-theme">:root{--accent-hue:${hue};--accent-chroma:${chroma}}</style>`
  return themePart + accentPart
}
