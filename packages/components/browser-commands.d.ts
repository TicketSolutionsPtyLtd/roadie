declare module 'vitest/browser' {
  interface BrowserCommands {
    reduceMotion: (reduce: boolean) => Promise<void>
    forcedColors: (active: boolean) => Promise<void>
    parkPointer: () => Promise<void>
  }
}

export {}
