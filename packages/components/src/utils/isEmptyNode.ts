import type { ReactNode } from 'react'

/** True for `null`/`undefined`/booleans/`''` and arrays where every item is empty. Never inspects elements — walking those throws on a still-streaming server child. */
export function isEmptyNode(node: ReactNode): boolean {
  if (Array.isArray(node)) return node.every(isEmptyNode)
  return node == null || typeof node === 'boolean' || node === ''
}
