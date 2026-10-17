import { Fragment, type ReactNode, isValidElement } from 'react'

/** True when the only child is an icon: a component element or a raw `<svg>`. Text, host elements like `<span>`, and fragments keep text padding. */
export function isIconOnly(children: ReactNode): boolean {
  if (!isValidElement(children) || children.type === Fragment) return false
  return typeof children.type !== 'string' || children.type === 'svg'
}
