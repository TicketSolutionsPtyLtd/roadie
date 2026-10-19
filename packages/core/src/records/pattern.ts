const compiled = new Map<string, RegExp | string>()

function compile(pattern: string): RegExp | string {
  if (!pattern.startsWith('^') || !pattern.endsWith('$')) {
    return 'needs ^ at the start and $ at the end, so it matches whole identifiers'
  }
  try {
    new RegExp(pattern)
  } catch (error) {
    return `is not a valid pattern: ${(error as Error).message}`
  }
  // Identifiers are typed in any case, as in oz-12345 for OZ-12345. The group
  // anchors the whole pattern, which ^a|b$ or an escaped \$ doesn't.
  return new RegExp(`^(?:${pattern})$`, 'i')
}

/**
 * A field's identifier `match`, compiled once. Throws for a pattern that
 * doesn't compile or isn't anchored.
 */
export function identifierPattern(field: {
  label: string
  match?: string
}): RegExp | undefined {
  if (field.match === undefined) return undefined
  let held = compiled.get(field.match)
  if (held === undefined) {
    held = compile(field.match)
    compiled.set(field.match, held)
  }
  if (typeof held === 'string') {
    throw new RangeError(`"${field.label}" match ${held}`)
  }
  return held
}
