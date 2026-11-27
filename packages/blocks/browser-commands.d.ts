import type { PointerStep } from '@oztix/roadie-browser-testing/config'

declare module 'vitest/browser' {
  interface BrowserCommands {
    focusPage: () => Promise<void>
    forcedColors: (active: boolean) => Promise<void>
    parkPointer: () => Promise<void>
    /** Drives a real mouse, in the test frame's CSS pixels. */
    pointer: (steps: PointerStep[]) => Promise<void>
    printMedia: (active: boolean) => Promise<void>
    reducedMotion: (active: boolean) => Promise<void>
  }
}

export {}
