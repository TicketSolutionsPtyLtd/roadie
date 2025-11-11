import { useSyncExternalStore } from 'react'

import {
  type ColorMode,
  getColorMode,
  subscribeToColorMode
} from '@oztix/roadie-core'

/**
 * React hook that subscribes to color mode changes.
 * Listens to both localStorage changes and custom colormodechange events.
 *
 * @returns The current color mode ('light' or 'dark')
 *
 * @example
 * ```tsx
 * import { useColorMode } from '@oztix/roadie-components'
 * import { toggleColorMode } from '@oztix/roadie-core'
 *
 * function ColorModeToggle() {
 *   const colorMode = useColorMode()
 *
 *   return (
 *     <button onClick={() => toggleColorMode()}>
 *       Current mode: {colorMode}
 *     </button>
 *   )
 * }
 * ```
 */
export function useColorMode(): ColorMode {
  return useSyncExternalStore(
    subscribeToColorMode,
    getColorMode,
    () => 'light' // Server snapshot
  )
}
