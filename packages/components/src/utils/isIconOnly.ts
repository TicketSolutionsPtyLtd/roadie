import { type ReactNode, isValidElement } from 'react'

/** True when the only child is an icon: a component element or a raw `<svg>`. Text, and host elements like `<span>`, keep text padding. */
export function isIconOnly(children: ReactNode): boolean {
  if (!isValidElement(children)) return false
  return typeof children.type !== 'string' || children.type === 'svg'
}
