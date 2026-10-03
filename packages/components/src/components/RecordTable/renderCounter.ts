// Production React has no Profiler, so renders are counted through the
// DevTools hook. react-dom reads the hook as it loads, so the perf project runs
// this file first, as a setup file.

type Fiber = {
  child: Fiber | null
  sibling: Fiber | null
  alternate: Fiber | null
  flags: number
  type: unknown
}

const PERFORMED_WORK = 1

const nameOf = (type: unknown): string | undefined => {
  if (typeof type === 'function')
    return (type as { displayName?: string }).displayName ?? type.name
  if (type && typeof type === 'object' && 'type' in type)
    return nameOf((type as { type: unknown }).type)
  return undefined
}

// On globalThis: the setup file and a test's import of it can be separate
// module instances, and react-dom holds the first one's hook.
const shared = globalThis as { __roadieRenderCounts?: Record<string, number> }

Object.assign(globalThis, {
  __REACT_DEVTOOLS_GLOBAL_HOOK__: {
    supportsFiber: true,
    renderers: new Map(),
    inject: () => 1,
    onCommitFiberRoot: (_: number, root: { current: Fiber }) => {
      const counting = shared.__roadieRenderCounts
      if (!counting) return
      const stack = [root.current]
      while (stack.length > 0) {
        const fiber = stack.pop()!
        // An update, not a mount.
        if (fiber.flags & PERFORMED_WORK && fiber.alternate) {
          const name = nameOf(fiber.type)
          if (name) counting[name] = (counting[name] ?? 0) + 1
        }
        if (fiber.child) stack.push(fiber.child)
        if (fiber.sibling) stack.push(fiber.sibling)
      }
    },
    onCommitFiberUnmount: () => {},
    onPostCommitFiberRoot: () => {},
    checkDCE: () => {}
  }
})

/** Counts component re-renders, by name, while `run` goes. */
export async function countRenders(run: () => Promise<void>) {
  const counting: Record<string, number> = {}
  shared.__roadieRenderCounts = counting
  try {
    await run()
    return counting
  } finally {
    shared.__roadieRenderCounts = undefined
  }
}
