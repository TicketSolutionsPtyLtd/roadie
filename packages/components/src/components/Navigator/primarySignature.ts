import { isValidElement } from 'react'

import type { NavigatorSlotMeta } from './mobileSlots'

const typeName = (type: unknown): string => {
  if (typeof type === 'string') return type
  if (typeof type === 'symbol') return type.description ?? ''
  if (typeof type === 'function' || (typeof type === 'object' && type)) {
    const named = type as { displayName?: string; name?: string }
    return named.displayName ?? named.name ?? '?'
  }
  return '?'
}

/**
 * The authored structure of Primary's children, ignoring element identity and
 * functions. Trees differing only in a non-primitive prop or an unnamed type
 * stay stale until the next structural change; handlers resolve at click time.
 */
export function primarySignature(node: unknown): string {
  if (node === null || node === undefined) return ''
  if (typeof node === 'string') return JSON.stringify(node)
  if (typeof node === 'number' || typeof node === 'boolean') {
    return String(node)
  }
  if (Array.isArray(node)) return `[${node.map(primarySignature).join(',')}]`
  if (!isValidElement<Record<string, unknown>>(node)) return ''
  const props = Object.entries(node.props)
    .filter(([, value]) => typeof value !== 'function')
    .map(([name, value]) => `${name}=${primarySignature(value)}`)
  return `<${typeName(node.type)} ${props.join(' ')}>`
}

/** What a folded row renders, so More republishes when any of it changes. */
export function slotsSignature(slots: NavigatorSlotMeta[]): string {
  return primarySignature(
    slots.map((slot) => [
      slot.value,
      slot.label,
      slot.icon,
      slot.badge,
      slot.href,
      slot.menu,
      slot.descendants,
      slot.group?.key,
      slot.group?.title
    ])
  )
}
