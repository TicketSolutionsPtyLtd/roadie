import { describe, expect, it } from 'vitest'

import roadieCss from '../../vitest.browser.css?inline'

// Chromium folds every rule's selector after a `:has()` anchor into one
// invalidation set. When anything a :has() argument could see changes (a
// menu opens, a row is ticked, a node is inserted), each anchor restyles the
// elements in its subtree that carry a feature from that set. Navigator and
// Pane anchor above the whole page, so the set must hold only narrow
// features: a class, an id, or a rare attribute named first. A universal
// restyles everything, a tag every such element, and `[data-slot=…]` every
// Roadie element, since Chromium keeps the attribute name and not its value.

// Limits: a string scan, not a selector parser. It reads core and component
// CSS as the test stylesheet compiles it, which also scans test files, so a
// class string only a test mentions can trip it; charts and docs CSS aren't
// read. It knows :is(), :where(), :not() and :has() nesting and escapes, not
// namespaces or `of S` in :nth-child(). See
// docs/solutions/best-practices/has-invalidation-scales-with-page.md.
const RARE_ATTRIBUTES = new Set(['data-column', 'data-level', 'data-stack'])

function selectorsOf(sheet: CSSStyleSheet) {
  const selectors: string[] = []
  const walk = (rules: CSSRuleList) => {
    for (const rule of rules) {
      if (rule instanceof CSSStyleRule) selectors.push(rule.selectorText)
      if ('cssRules' in rule) walk(rule.cssRules as CSSRuleList)
    }
  }
  walk(sheet.cssRules)
  return selectors
}

function closingParen(selector: string, open: number) {
  let depth = 0
  for (let at = open; at < selector.length; at += 1) {
    if (selector[at] === '\\') at += 1
    else if (selector[at] === '(') depth += 1
    else if (selector[at] === ')' && --depth === 0) return at
  }
  return selector.length
}

// The compounds from the anchor to the subject. A wrapper such as :not()
// closing before any combinator means the anchor is the compound outside it.
function compoundsAfter(selector: string, from: number) {
  let compounds = ['anchor']
  for (let at = from; at < selector.length; at += 1) {
    const char = selector[at]!
    const last = compounds.length - 1
    if (char === '\\') {
      compounds[last] += selector.slice(at, at + 2)
      at += 1
    } else if (char === '[') {
      const end = selector.indexOf(']', at)
      compounds[last] += selector.slice(at, end + 1)
      at = end
    } else if (char === '(') {
      const end = closingParen(selector, at)
      compounds[last] += selector.slice(at, end + 1)
      at = end
    } else if (char === ')') {
      if (compounds.length > 1) return compounds
      compounds = ['anchor']
    } else if (char === ',') {
      return compounds
    } else if (/[\s>~+]/.test(char)) {
      if (compounds[last]!.trim()) compounds.push('')
    } else {
      compounds[last] += char
    }
  }
  return compounds
}

function splitList(list: string) {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let at = 0; at < list.length; at += 1) {
    if (list[at] === '\\') at += 1
    else if ('(['.includes(list[at]!)) depth += 1
    else if (')]'.includes(list[at]!)) depth -= 1
    else if (list[at] === ',' && depth === 0) {
      parts.push(list.slice(start, at).trim())
      start = at + 1
    }
  }
  return [...parts, list.slice(start).trim()]
}

// A compound's own selectors, without functional pseudo arguments, and the
// branch lists of its :is() and :where().
function compoundParts(compound: string) {
  const groups: string[] = []
  let own = ''
  for (let at = 0; at < compound.length; at += 1) {
    const pseudo = /^:([\w-]+)\(/.exec(compound.slice(at))
    if (compound[at] === '\\') {
      own += compound.slice(at, at + 2)
      at += 1
    } else if (compound[at] === '[') {
      const end = compound.indexOf(']', at)
      own += compound.slice(at, end + 1)
      at = end
    } else if (pseudo) {
      const close = closingParen(compound, at + pseudo[0].length - 1)
      if (pseudo[1] === 'is' || pseudo[1] === 'where')
        groups.push(compound.slice(at + pseudo[0].length, close))
      at = close
    } else own += compound[at]
  }
  return { own, groups }
}

// Chromium's pick for a compound: a class or id, else its first attribute,
// else its tag. An :is() or :where() is narrow when every branch is.
function isNarrow(compound: string): boolean {
  const { own, groups } = compoundParts(compound)
  if (/(^|[^\\])[.#](?!\d)/.test(own.replace(/\[[^\]]*\]/g, ''))) return true
  const attribute = /^[^[]*?\[([\w-]+)/.exec(own)
  if (attribute) return RARE_ATTRIBUTES.has(attribute[1]!)
  return groups.some((group) => splitList(group).every(isNarrow))
}

/** The broad subjects a selector puts after a :has() anchor. */
function broadAfterHas(selector: string) {
  const broad: string[] = []
  for (
    let start = selector.indexOf(':has(');
    start !== -1;
    start = selector.indexOf(':has(', start + 1)
  ) {
    if (selector[start - 1] === '\\') continue
    const compounds = compoundsAfter(
      selector,
      closingParen(selector, start + 4) + 1
    )
    const subject = compounds.at(-1)!
    if (compounds.length > 1 && !isNarrow(subject)) broad.push(subject)
  }
  return broad
}

// The top-level compound around a position.
function compoundAround(selector: string, at: number) {
  let depth = 0
  let start = 0
  let end = selector.length
  for (let index = 0; index < selector.length; index += 1) {
    const char = selector[index]!
    if (char === '\\') index += 1
    else if ('(['.includes(char)) depth += 1
    else if (')]'.includes(char)) depth -= 1
    else if (depth === 0 && /[\s>~+,]/.test(char)) {
      if (index < at) start = index + 1
      else {
        end = index
        break
      }
    }
  }
  return selector.slice(start, end)
}

// Whether a compound names a tag, class, id or attribute of its own, or holds
// an :is() or :where() whose every branch does.
function hasKey(compound: string): boolean {
  const { own, groups } = compoundParts(compound)
  if (/[\w\]]/.test(own.replace(/::?[\w-]+/g, ''))) return true
  return groups.some((group) => splitList(group).every(hasKey))
}

// A `:has(~ …)` in a compound with nothing else to match on is tried against
// every element, which then all re-check their later siblings whenever one
// changes: 900ms for a menu beside 2,000 siblings.
function unkeyedLaterSiblingHas(selector: string) {
  return [...selector.matchAll(/:has\(\s*~/g)].some(
    (match) => !hasKey(compoundAround(selector, match.index))
  )
}

describe('Roadie CSS and :has() invalidation', () => {
  it('spots a broad subject after a :has() anchor', () => {
    const broad = (selector: string) => broadAfterHas(selector).length > 0
    expect(broad('.a:has(> .b) > *')).toBe(true)
    expect(broad('.u:is(:where(.group\\/x):has(.b) *)')).toBe(true)
    expect(broad('.a:not(:has(.b)) *')).toBe(true)
    expect(broad('.a:has(.b) [data-slot="c"]')).toBe(true)
    expect(broad('.a:has(.b) > li > * > [data-slot="c"]::after')).toBe(true)
    expect(broad('.a:has(.b) [data-slot="c"][data-level="0"]')).toBe(true)
    expect(broad('.a > li:has(+ li) > div')).toBe(true)
    expect(broad('.a:not(:has(.b)) [data-priority="3"]')).toBe(true)
    expect(broad(':where(.a:has(.b)) :where(a[href], button)')).toBe(true)
    expect(broad('.a:has(.b) :is(.c, *)')).toBe(true)
    expect(broad('.a:has(.b) :not(.c)')).toBe(true)
    expect(broad('.a:has(.b) [data-slot="c"]:not(.d)')).toBe(true)
    expect(broad('.a:has(.b) .c')).toBe(false)
    expect(broad('.a:has(.b) [data-slot="c"].d:hover')).toBe(false)
    expect(broad('.a:has(.b) [data-level="0"][data-slot="c"]')).toBe(false)
    expect(broad('.a > li:has(+ li) > * > .c::after')).toBe(false)
    expect(broad('.a:has(.b) .c:not(.d *)')).toBe(false)
    expect(broad('.a:has(*) .c')).toBe(false)
    expect(broad('.a > :is(:has(~ .b), .b ~ *)')).toBe(false)
    expect(broad(':where([data-x]:has(.b)) .in-\\[\\:has\\(\\)\\]\\:c')).toBe(
      false
    )
    expect(broad('.a:has(.b), .c [data-slot="d"]')).toBe(false)
  })

  it('spots a later-sibling :has() with nothing else to match on', () => {
    const unkeyed = unkeyedLaterSiblingHas
    expect(unkeyed('.a > :is(:has(~ .b), .b)')).toBe(true)
    expect(unkeyed('.a > :not(.c):not(:has(~ :not(.c)))')).toBe(true)
    expect(unkeyed('.a > li:has(~ li:hover)')).toBe(false)
    expect(unkeyed('[data-x]:is(.c, :has(~ .b))')).toBe(false)
    expect(unkeyed(':where([data-x]:has(~ .b))')).toBe(false)
    expect(unkeyed('.a > :has(+ .b)')).toBe(false)
  })

  it('ships no later-sibling :has() with nothing else to match on', () => {
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(roadieCss)
    expect(selectorsOf(sheet).filter(unkeyedLaterSiblingHas)).toEqual([])
  })

  it('ships no rule with a broad subject after a :has() anchor', () => {
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(roadieCss)
    expect(
      selectorsOf(sheet).filter((selector) => broadAfterHas(selector).length)
    ).toEqual([])
  })
})
