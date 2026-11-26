declare module 'vitest/browser' {
  interface BrowserCommands {
    /** Drives a real mouse, in the test frame's CSS pixels. */
    pointer: (
      steps: (
        | { type: 'move'; x: number; y: number; steps?: number }
        | { type: 'wait'; ms: number }
      )[]
    ) => Promise<void>
    reducedMotion: (active: boolean) => Promise<void>
  }
}

export {}
