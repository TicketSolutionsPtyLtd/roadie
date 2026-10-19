type EngineModule = typeof import('./EditorEngine')

let engine: EngineModule | undefined
const listeners = new Set<() => void>()

export function loadedEngine() {
  return engine
}

export function subscribeToEngine(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Starts loading the editor, so it's ready by the time one mounts. Call it on
 * the hover or focus that leads to an editor. Resolves true once it has
 * loaded; a failed load can be tried again.
 */
export function preloadEditor(): Promise<boolean> {
  if (engine) return Promise.resolve(true)
  return import('./EditorEngine').then(
    (module) => {
      engine = module
      for (const listener of listeners) listener()
      return true
    },
    () => false
  )
}
