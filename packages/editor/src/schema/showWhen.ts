/**
 * A rule for showing an email block, naming a variable by key. The sending
 * system's syntax is chosen when the email renders.
 */
export type ShowWhen =
  | { key: string; op: 'exists' }
  | { key: string; op: 'equals' | 'notEquals'; value: string | number }
  | { key: string; op: 'lessThan' | 'greaterThan'; value: number }

export type ShowWhenOp = ShowWhen['op']

const isText = (value: unknown): value is string =>
  typeof value === 'string' && value !== ''

/** A saved rule with only its key, op and value, or undefined when malformed. */
export function showWhenRule(rule: unknown): ShowWhen | undefined {
  if (typeof rule !== 'object' || rule === null || Array.isArray(rule)) {
    return undefined
  }
  const { key, op, value } = rule as Record<string, unknown>
  if (!isText(key)) return undefined
  if (op === 'exists') return { key, op }
  const isNumber = typeof value === 'number' && Number.isFinite(value)
  if (op === 'lessThan' || op === 'greaterThan') {
    return isNumber ? { key, op, value } : undefined
  }
  if (op === 'equals' || op === 'notEquals') {
    return isNumber || isText(value) ? { key, op, value } : undefined
  }
  return undefined
}
