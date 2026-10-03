/**
 * A small evaluator for the subset of Meilisearch's filter grammar that
 * `toMeilisearch` writes, following Meilisearch's documented rules: string
 * equality ignores case, `=` on a list matches any element, `!=` and NOT
 * keep documents missing the attribute, and comparisons on strings are
 * lexicographic. Test-only.
 */
type Doc = Record<string, unknown>
type Value = string | number
type Token = { kind: 'word' | 'string' | 'number' | 'symbol'; text: string }

function tokenise(source: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < source.length) {
    const char = source[i]!
    if (/\s/.test(char)) {
      i++
    } else if (char === '"') {
      let text = ''
      i++
      while (source[i] !== '"') {
        if (source[i] === '\\' && source[i + 1] === '"') {
          text += '"'
          i += 2
        } else text += source[i++]
      }
      i++
      tokens.push({ kind: 'string', text })
    } else if (/[()[\],]/.test(char)) {
      tokens.push({ kind: 'symbol', text: char })
      i++
    } else if (/[=!<>]/.test(char)) {
      const two = source.slice(i, i + 2)
      const text = ['!=', '<=', '>='].includes(two) ? two : char
      tokens.push({ kind: 'symbol', text })
      i += text.length
    } else {
      const m = /^[^\s()[\],=!<>"]+/.exec(source.slice(i))!
      const text = m[0]
      tokens.push({
        kind: /^-?\d+(\.\d+)?$/.test(text) ? 'number' : 'word',
        text
      })
      i += text.length
    }
  }
  return tokens
}

function values(doc: Doc, attribute: string): unknown[] {
  const value = doc[attribute]
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

function equal(actual: unknown, expected: Value): boolean {
  if (typeof expected === 'number') return actual === expected
  if (typeof actual === 'boolean') return String(actual) === expected
  return (
    typeof actual === 'string' &&
    actual.toLowerCase() === expected.toLowerCase()
  )
}

function compare(actual: unknown, expected: Value): number | null {
  if (typeof expected === 'number') {
    return typeof actual === 'number' ? actual - expected : null
  }
  if (typeof actual !== 'string') return null
  return actual < expected ? -1 : actual > expected ? 1 : 0
}

function isEmpty(value: unknown): boolean {
  return (
    value === '' ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.keys(value).length === 0)
  )
}

export function evaluateMeilisearch(filter: string, doc: Doc): boolean {
  const tokens = tokenise(filter)
  let at = 0
  const peek = () => tokens[at]
  const take = () => tokens[at++]!
  const word = (text: string) =>
    peek()?.kind === 'word' && peek()!.text.toUpperCase() === text

  function value(): Value {
    const token = take()
    return token.kind === 'number' ? Number(token.text) : token.text
  }

  function list(): Value[] {
    take()
    const items: Value[] = []
    while (peek()!.text !== ']') {
      items.push(value())
      if (peek()!.text === ',') take()
    }
    take()
    return items
  }

  function condition(): boolean {
    const attribute = take().text
    const found = values(doc, attribute)
    const any = (test: (v: unknown) => boolean) => found.some(test)
    if (word('NOT')) {
      take()
      if (word('IN')) {
        take()
        const items = list()
        return !any((v) => items.some((item) => equal(v, item)))
      }
      take()
      return !(attribute in doc)
    }
    if (word('IN')) {
      take()
      const items = list()
      return any((v) => items.some((item) => equal(v, item)))
    }
    if (word('EXISTS')) {
      take()
      return attribute in doc
    }
    if (word('IS')) {
      take()
      const negate = word('NOT') ? (take(), true) : false
      const kind = take().text.toUpperCase()
      const raw = doc[attribute]
      const result = kind === 'NULL' ? raw === null : isEmpty(raw)
      return negate ? !result : result
    }
    if (word('CONTAINS')) {
      take()
      const needle = String(value()).toLowerCase()
      return any(
        (v) => typeof v === 'string' && v.toLowerCase().includes(needle)
      )
    }
    const op = peek()!
    if (op.kind !== 'symbol') {
      const low = value()
      take()
      const high = value()
      return any((v) => {
        const a = compare(v, low)
        const b = compare(v, high)
        return a !== null && b !== null && a >= 0 && b <= 0
      })
    }
    take()
    const expected = value()
    switch (op.text) {
      case '=':
        return any((v) => equal(v, expected))
      case '!=':
        return !any((v) => equal(v, expected))
      default:
        return any((v) => {
          const c = compare(v, expected)
          if (c === null) return false
          return op.text === '<'
            ? c < 0
            : op.text === '>'
              ? c > 0
              : op.text === '<='
                ? c <= 0
                : c >= 0
        })
    }
  }

  function unary(): boolean {
    if (word('NOT')) {
      take()
      return !unary()
    }
    if (peek()!.text === '(') {
      take()
      const result = or()
      take()
      return result
    }
    return condition()
  }

  function and(): boolean {
    let result = unary()
    while (word('AND')) {
      take()
      result = unary() && result
    }
    return result
  }

  function or(): boolean {
    let result = and()
    while (word('OR')) {
      take()
      result = and() || result
    }
    return result
  }

  const result = or()
  if (at !== tokens.length) throw new Error(`Unread filter text: ${filter}`)
  return result
}
