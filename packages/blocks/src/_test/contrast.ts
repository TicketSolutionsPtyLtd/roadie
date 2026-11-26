export {
  fillContrast,
  textContrast
} from '@oztix/roadie-browser-testing/contrast'

/** Roadie's APCA floors for block text (docs/decisions/0010-apca-contrast.md). */
export const MINIMUM_LC = { body: 60, large: 45 } as const

/** The least a filled control's fill should differ from the surface it sits on. */
export const MINIMUM_FILL_LC = 15

export const MODES = ['light', 'dark'] as const

export function setMode(mode: (typeof MODES)[number]) {
  document.documentElement.classList.toggle('dark', mode === 'dark')
}
