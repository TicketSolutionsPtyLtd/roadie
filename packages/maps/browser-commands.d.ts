declare module 'vitest/browser' {
  interface BrowserCommands {
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
