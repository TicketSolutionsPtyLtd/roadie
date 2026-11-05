import { type ReactElement, type ReactNode, isValidElement } from 'react'

import {
  NavigatorPrimary,
  type NavigatorPrimaryProps
} from './NavigatorPrimary'
import { mapChildrenInPlace } from './childrenInPlace'

export function splitPrimary(children: ReactNode) {
  let primary: ReactElement<NavigatorPrimaryProps> | undefined
  let hasRest = false
  const rest = mapChildrenInPlace(children, (node) => {
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
  })
  return { primary, rest: hasRest ? rest : undefined }
}
