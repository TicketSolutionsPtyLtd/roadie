declare module 'vitest/browser' {
  interface BrowserCommands {
    forcedColors: (active: boolean) => Promise<void>
    parkPointer: () => Promise<void>
    pointer: (
      steps: (
        | { type: 'move'; x: number; y: number; steps?: number }
        | { type: 'down' }
        | { type: 'up' }
      )[]
    ) => Promise<void>
    printMedia: (active: boolean) => Promise<void>
    reducedMotion: (active: boolean) => Promise<void>
  }
}

export {}
