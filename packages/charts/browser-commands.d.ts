declare module 'vitest/browser' {
  interface BrowserCommands {
    forcedColors: (active: boolean) => Promise<void>
    reducedMotion: (active: boolean) => Promise<void>
  }
}

export {}
