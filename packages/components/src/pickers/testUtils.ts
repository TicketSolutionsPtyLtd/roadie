import { onTestFinished, vi } from 'vitest'

import { PHONE } from './PickerShell'

/** Makes the picker's phone query match, until the test ends. */
export function onPhone(matches = true) {
  const listeners = new Set<() => void>()
  let phone = matches
  const original = window.matchMedia
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => {
    if (query !== PHONE) return original(query)
    return {
      get matches() {
        return phone
      },
      media: query,
      onchange: null,
      addEventListener: (_: string, listener: () => void) =>
        listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) =>
        listeners.delete(listener),
      addListener: (listener: () => void) => listeners.add(listener),
      removeListener: (listener: () => void) => listeners.delete(listener),
      dispatchEvent: () => true
    } as unknown as MediaQueryList
  })
  onTestFinished(() => vi.mocked(window.matchMedia).mockRestore())
  return {
    set(next: boolean) {
      phone = next
      listeners.forEach((listener) => listener())
    }
  }
}
