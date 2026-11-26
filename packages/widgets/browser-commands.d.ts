declare module 'vitest/browser' {
  interface BrowserCommands {
    pointer: (
      steps: ({ type: 'move'; x: number; y: number } | { type: 'down' | 'up' })[]
    ) => Promise<void>
  }
}

export {}
