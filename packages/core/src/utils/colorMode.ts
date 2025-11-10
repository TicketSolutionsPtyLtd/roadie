declare global {
  interface Window {
    __colorMode: 'light' | 'dark'
  }
}

export type ColorMode = 'light' | 'dark'

/**
 * Gets the current color mode from the DOM.
 *
 * @returns The current color mode ('light' or 'dark')
 *
 * @example
 * ```ts
 * const mode = getColorMode()
 * console.log(mode) // 'light' or 'dark'
 * ```
 */
export function getColorMode(): ColorMode {
  if (typeof window === 'undefined') return 'light'
  return (
    (document.documentElement.getAttribute('data-color-mode') as ColorMode) ||
    'light'
  )
}

/**
 * Sets the color mode.
 * Updates the DOM, localStorage, and dispatches an event for subscribers.
 *
 * @param mode - The color mode to set ('light' or 'dark')
 *
 * @example
 * ```ts
 * setColorMode('dark')
 * ```
 */
export function setColorMode(mode: ColorMode): void {
  if (typeof window === 'undefined') return

  document.documentElement.setAttribute('data-color-mode', mode)
  localStorage.setItem('colorMode', mode)
  window.__colorMode = mode
  // Dispatch custom event to notify subscribers
  window.dispatchEvent(new Event('colormodechange'))
}

/**
 * Toggles the color mode between light and dark.
 * Updates the DOM, localStorage, and dispatches an event for subscribers.
 *
 * @returns The new color mode after toggling
 *
 * @example
 * ```ts
 * const newMode = toggleColorMode()
 * console.log(newMode) // 'dark' if was 'light', 'light' if was 'dark'
 * ```
 */
export function toggleColorMode(): ColorMode {
  const currentMode = getColorMode()
  const newMode: ColorMode = currentMode === 'light' ? 'dark' : 'light'
  setColorMode(newMode)
  return newMode
}

/**
 * Subscribes to color mode changes.
 * Returns an unsubscribe function.
 *
 * @param callback - Function to call when color mode changes
 * @returns Unsubscribe function
 *
 * @example
 * ```ts
 * const unsubscribe = subscribeToColorMode((mode) => {
 *   console.log('Color mode changed to:', mode)
 * })
 *
 * // Later, to stop listening:
 * unsubscribe()
 * ```
 */
export function subscribeToColorMode(
  callback: (mode: ColorMode) => void
): () => void {
  if (typeof window === 'undefined') return () => {}

  const handler = () => {
    callback(getColorMode())
  }

  // Listen for both storage events and custom color mode change events
  window.addEventListener('storage', handler)
  window.addEventListener('colormodechange', handler)

  return () => {
    window.removeEventListener('storage', handler)
    window.removeEventListener('colormodechange', handler)
  }
}
