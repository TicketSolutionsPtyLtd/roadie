declare module 'vitest/browser' {
  interface BrowserCommands {
    forcedColors: (active: boolean) => Promise<void>
    printMedia: (active: boolean) => Promise<void>
    reducedMotion: (active: boolean) => Promise<void>
  }
}

export {}
