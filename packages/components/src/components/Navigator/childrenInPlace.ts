import type { ReactNode } from 'react'

// Children.toArray and Children.map re-key their copies, and React marks a copy
// for a key warning when the original skipped JSX's key check, as a streamed
// child does. These walks keep every child as given.

/**
 * Replaces each child, materialising iterables without re-keying their
 * children. `index` is the child's position in its own list, as React's
 * implicit key counts it.
 */
export function mapChildrenInPlace(
  children: ReactNode,
  visit: (child: ReactNode, index: number) => ReactNode
): ReactNode {
  const walk = (node: ReactNode, index: number): ReactNode =>
    isIterable(node) ? Array.from(node, walk) : visit(node, index)
  return walk(children, 0)
}

/** What a streamed child resolved to, when React can read it without suspending. */
export function settled(node: ReactNode): ReactNode {
  if (typeof node !== 'object' || node === null || !('then' in node)) {
    return node
  }
  const thenable = node as { status?: string; value?: ReactNode }
  return thenable.status === 'fulfilled' ? thenable.value : node
}

const isIterable = (node: ReactNode): node is Iterable<ReactNode> =>
  typeof node === 'object' && node !== null && Symbol.iterator in node
