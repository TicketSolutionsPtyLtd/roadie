import { describe, expect, it } from 'vitest'

import roadieCss from '../../vitest.browser.css?inline'

// A bundler that lowers CSS nesting, as Next's does, turns `.p { &.a, &.b {} }`
// into `:is(.p.a, .p.b)`, which takes the weight of its heaviest branch. If
// the branches differ, the rule outranks rules it was written to lose to:
// emphasis-subtler's resting `transparent` beat its own hover tint. So every
// branch of an emphasis utility's selector list has to weigh the same.

type Weight = [number, number, number]

const add = (a: Weight, b: Weight): Weight => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2]
]
const heavier = (a: Weight, b: Weight) =>
  a[0] !== b[0] ? a[0] > b[0] : a[1] !== b[1] ? a[1] > b[1] : a[2] > b[2]

function closing(text: string, open: number) {
  let depth = 0
  for (let at = open; at < text.length; at += 1) {
    if (text[at] === '\\') at += 1
    else if (text[at] === '(') depth += 1
    else if (text[at] === ')' && --depth === 0) return at
  }
  return text.length
}

function branches(list: string) {
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

/** A selector's specificity, with `&` weighing as its parent does. */
export function weight(selector: string, parent: Weight = [0, 0, 0]): Weight {
  let total: Weight = [0, 0, 0]
  for (let at = 0; at < selector.length; at += 1) {
    const char = selector[at]!
    const rest = selector.slice(at)
    if (char === '\\') at += 1
    else if (char === '&') total = add(total, parent)
    else if (char === '#') total = add(total, [1, 0, 0])
    else if (char === '.') total = add(total, [0, 1, 0])
    else if (char === '[') {
      total = add(total, [0, 1, 0])
      at = selector.indexOf(']', at)
    } else if (rest.startsWith('::')) {
      total = add(total, [0, 0, 1])
      at += /^::[\w-]+/.exec(rest)![0].length - 1
    } else if (char === ':') {
      const name = /^:([\w-]+)/.exec(rest)![1]!
      const open = at + name.length + 1
      if (selector[open] === '(') {
        const close = closing(selector, open)
        const args = selector.slice(open + 1, close)
        if (['is', 'not', 'has'].includes(name)) {
          const heaviest = branches(args)
            .map((branch) => weight(branch, parent))
            .reduce((a, b) => (heavier(b, a) ? b : a))
          total = add(total, heaviest)
        } else if (name !== 'where') total = add(total, [0, 1, 0])
        at = close
      } else {
        total = add(total, [0, 1, 0])
        at = open - 1
      }
    } else if (
      /[a-z]/i.test(char) &&
      /(^|[\s>+~(,])$/.test(selector.slice(0, at))
    ) {
      total = add(total, [0, 0, 1])
      at += /^[\w-]+/.exec(rest)![0].length - 1
    }
  }
  return total
}

function uneven(sheet: CSSStyleSheet) {
  const found: string[] = []
  const walk = (rules: CSSRuleList, parent?: CSSStyleRule) => {
    for (const rule of rules) {
      let scope = parent
      if (rule instanceof CSSStyleRule) {
        if (parent && /^\.emphasis-[\w-]+$/.test(parent.selectorText)) {
          const own = weight(parent.selectorText)
          const weights = branches(rule.selectorText).map((branch) =>
            weight(branch, own).join(',')
          )
          if (new Set(weights).size > 1)
            found.push(`${parent.selectorText} { ${rule.selectorText} }`)
        }
        scope = rule
      }
      if ('cssRules' in rule) walk(rule.cssRules as CSSRuleList, scope)
    }
  }
  walk(sheet.cssRules)
  return found
}

describe('emphasis selector lists under lowered nesting', () => {
  it('weighs selectors as the cascade does', () => {
    expect(weight('.a.b:hover')).toEqual([0, 3, 0])
    expect(weight('&.a', [0, 1, 0])).toEqual([0, 2, 0])
    expect(weight('.a:has([b]):not(:has(.c [d]))')).toEqual([0, 4, 0])
    expect(weight('.a:where(:has([b]):not(.c))')).toEqual([0, 1, 0])
    expect(weight('button::after')).toEqual([0, 0, 2])
  })

  it('gives every branch of an emphasis utility’s list the same weight', () => {
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(roadieCss)
    expect(uneven(sheet)).toEqual([])
  })
})
