declare module 'vitest/browser' {
  interface BrowserCommands {
    reducedMotion: (active: boolean) => Promise<void>
  }
}

export {}
