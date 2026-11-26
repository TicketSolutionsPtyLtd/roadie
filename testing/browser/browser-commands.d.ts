import type { PointerStep } from './src/pointer'

declare module 'vitest/browser' {
  interface BrowserCommands {
    /** Drives a real mouse, in the test frame's CSS pixels. */
    pointer: (steps: PointerStep[]) => Promise<void>
  }
}

export {}
