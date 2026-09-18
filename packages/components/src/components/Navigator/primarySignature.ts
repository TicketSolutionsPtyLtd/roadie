import { isValidElement } from 'react'

import type { NavigatorSlotMeta } from './mobileSlots'

let nextIdentity = 0
const identities = new WeakMap<object, number>()

const identityOf = (value: object) => {
  const known = identities.get(value)
  if (known !== undefined) return known
  const identity = nextIdentity++
  identities.set(value, identity)
  return identity
}

const typeName = (type: unknown): string => {
  if (typeof type === 'string') return type
  if (typeof type === 'symbol') return type.description ?? ''
  if (typeof type === 'function' || (typeof type === 'object' && type)) {
    const named = type as { displayName?: string; name?: string }
    return `${named.displayName ?? named.name ?? '?'}#${identityOf(type)}`
  }
  return '?'
}

/** Primary's authored structure, ignoring element identity but keeping values React can't compare structurally. */
export function primarySignature(node: unknown): string {
  if (node === null || node === undefined) return ''
  if (typeof node === 'string') return JSON.stringify(node)
  if (
    typeof node === 'number' ||
    typeof node === 'boolean' ||
    typeof node === 'bigint'
  ) {
    return String(node)
  }
  if (typeof node === 'symbol') return `symbol:${String(node)}`
  if (typeof node === 'function') return `function:${identityOf(node)}`
  if (Array.isArray(node)) return `[${node.map(primarySignature).join(',')}]`
  if (!isValidElement<Record<string, unknown>>(node)) {
    return `object:${identityOf(node as object)}`
  }
  const props = Object.entries(node.props).map(
    ([name, value]) => `${name}=${primarySignature(value)}`
  )
  return `<${typeName(node.type)} key=${String(node.key)} ${props.join(' ')}>`
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
