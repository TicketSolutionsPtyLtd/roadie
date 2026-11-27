import type { PointerStep } from '@oztix/roadie-browser-testing/config'

declare module 'vitest/browser' {
  interface BrowserCommands {
    /** Drives a real mouse, in the test frame's CSS pixels. */
    pointer: (steps: PointerStep[]) => Promise<void>
    reduceMotion: (reduce: boolean) => Promise<void>
    /** A finger drag, in the test frame's CSS pixels. Chromium touch only. */
    swipe: (
      from: { x: number; y: number },
      to: { x: number; y: number },
      /** Keeps the finger still at `to` this long before lifting. */
      options?: { holdMs?: number }
    ) => Promise<void>
  }
}

export {}
