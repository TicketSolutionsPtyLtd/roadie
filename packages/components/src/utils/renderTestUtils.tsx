import { Profiler, type ReactNode } from 'react'

import { act, render } from '@testing-library/react'

type Fiber = {
  child: Fiber | null
  sibling: Fiber | null
  alternate: Fiber | null
  flags: number
  type: unknown
  stateNode: { current?: Fiber } | null
}

const PERFORMED_WORK = 1

const nameOf = (type: unknown): string | undefined => {
  if (typeof type === 'function')
    return (type as { displayName?: string }).displayName || type.name
  if (!type || typeof type !== 'object') return undefined
  const wrapped = type as { displayName?: string; render?: unknown }
  // A memo is a fiber of its own above the one that renders.
  if ('compare' in wrapped) return undefined
  return wrapped.displayName ?? nameOf(wrapped.render)
}

/**
 * Renders `ui` under a Profiler. `measure` counts the components that render
 * again, by name, while one interaction runs. Mounts aren't counted.
 */
export function renderProfiled(ui: ReactNode) {
  let counts: Record<string, number> | null = null
  let root: () => Fiber | undefined = () => undefined
  const onRender = (_id: string, phase: string) => {
    const tree = root()
    if (!counts || phase === 'mount' || !tree) return
    const into = counts
    // As React DevTools does: a child list shared with the previous tree was
    // not worked on in this commit, and its fibers keep stale flags.
    const walk = (fiber: Fiber, previous: Fiber | null) => {
      if (fiber.child === (previous?.child ?? null)) return
      for (let child = fiber.child; child; child = child.sibling) {
        const name = nameOf(child.type)
        if (child.flags & PERFORMED_WORK && child.alternate && name)
          into[name] = (into[name] ?? 0) + 1
        walk(child, child.alternate)
      }
    }
    walk(tree, tree.alternate)
  }
  const { container } = render(
    <Profiler id='renders' onRender={onRender}>
      {ui}
    </Profiler>
  )
  const key = Object.keys(container).find((name) =>
    name.startsWith('__reactContainer$')
  )!
  const host = (container as unknown as Record<string, Fiber>)[key]!
  root = () => host.stateNode?.current ?? host

  async function measure(run: () => void) {
    const into: Record<string, number> = {}
    counts = into
    await act(async () => run())
    counts = null
    return into
  }
  return { measure }
}
