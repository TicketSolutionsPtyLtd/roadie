import type { ReactNode } from 'react'

// Children.toArray and Children.map re-key their copies, and React marks a copy
// for a key warning when the original skipped JSX's key check, as a streamed
// child does. These walks keep every child as given.

/** Replaces each child, materialising iterables without re-keying their children. */
export function mapChildrenInPlace(
  children: ReactNode,
  visit: (child: ReactNode) => ReactNode
): ReactNode {
  const walk = (node: ReactNode): ReactNode =>
    isIterable(node) ? Array.from(node, walk) : visit(node)
  return walk(children)
}

/** Every child that renders, in order, without re-keying it. */
export function flattenChildren(children: ReactNode): ReactNode[] {
  const flat: ReactNode[] = []
  const walk = (node: ReactNode) => {
    if (isIterable(node)) {
      for (const child of node) walk(child)
    } else if (node != null && typeof node !== 'boolean') {
      flat.push(node)
    }
  }
  walk(children)
  return flat
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
