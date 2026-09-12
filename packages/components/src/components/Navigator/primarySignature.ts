import { type ReactNode, isValidElement } from 'react'

const typeName = (type: unknown): string => {
  if (typeof type === 'string') return type
  if (typeof type === 'symbol') return type.description ?? ''
  if (typeof type === 'function' || (typeof type === 'object' && type)) {
    const named = type as { displayName?: string; name?: string }
    return named.displayName ?? named.name ?? '?'
  }
  return '?'
}

function serialize(node: unknown): string {
  if (node === null || node === undefined) return ''
  if (typeof node === 'string') return JSON.stringify(node)
  if (typeof node === 'number' || typeof node === 'boolean') {
    return String(node)
  }
  if (Array.isArray(node)) return `[${node.map(serialize).join(',')}]`
  if (!isValidElement<Record<string, unknown>>(node)) return ''
  const props = Object.entries(node.props)
    .filter(([, value]) => typeof value !== 'function')
    .map(([name, value]) => `${name}=${serialize(value)}`)
  return `<${typeName(node.type)} ${props.join(' ')}>`
}

/**
 * The authored structure of Primary's children — types, primitive props and
 * nested elements — ignoring element identity and functions.
 */
export function primarySignature(children: ReactNode): string {
  return serialize(children)
}
