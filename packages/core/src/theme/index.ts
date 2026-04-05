const THEME_STORAGE_KEY = 'theme'

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
