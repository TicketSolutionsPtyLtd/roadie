import type { PointerStep } from '@oztix/roadie-browser-testing/config'

declare module 'vitest/browser' {
  interface BrowserCommands {
    /** Drives a real mouse, in the test frame's CSS pixels. */
    pointer: (steps: PointerStep[]) => Promise<void>
    reducedMotion: (active: boolean) => Promise<void>
  }
}

export {}
