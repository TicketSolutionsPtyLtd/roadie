import { type ReactElement, type ReactNode, isValidElement } from 'react'

import {
  NavigatorPrimary,
  type NavigatorPrimaryProps
} from './NavigatorPrimary'

// The rest stays as given: Children.toArray's re-keyed copies trip React's key
// warning for a child that arrived as a promise.
export function splitPrimary(children: ReactNode) {
  let primary: ReactElement<NavigatorPrimaryProps> | undefined
  let hasRest = false
  const walk = (node: ReactNode): ReactNode => {
    if (isIterable(node)) return Array.from(node, walk)
    if (
      primary === undefined &&
      isValidElement<NavigatorPrimaryProps>(node) &&
      node.type === NavigatorPrimary
    ) {
      primary = node
      return null
    }
    if (node === null || typeof node !== 'object') return null
    hasRest = true
    return node
  }
  const rest = walk(children)
  return { primary, rest: hasRest ? rest : undefined }
}

const isIterable = (node: ReactNode): node is Iterable<ReactNode> =>
  typeof node === 'object' && node !== null && Symbol.iterator in node
