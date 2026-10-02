type PointerStep =
  | { type: 'move'; x: number; y: number; steps?: number }
  | { type: 'down' }
  | { type: 'up' }
  | { type: 'wait'; ms: number }

declare module 'vitest/browser' {
  interface BrowserCommands {
    reduceMotion: (reduce: boolean) => Promise<void>
    forcedColors: (active: boolean) => Promise<void>
    parkPointer: () => Promise<void>
    /** Drives a real mouse, in the test frame's CSS pixels. */
    pointer: (steps: PointerStep[]) => Promise<void>
  }
}

export {}
