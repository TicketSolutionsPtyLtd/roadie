import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compile } from 'tailwindcss'
import { beforeAll, describe, expect, it } from 'vitest'

const cssDir = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

type Rule = { selector: string; body: string; layers: string[] }

// Compiles roadie.css with the safelist's candidates, as `build:css` does.
const compileRoadie = async () => {
  const safelist = await readFile(resolve(cssDir, 'safelist.html'), 'utf8')
  const candidates = [...safelist.matchAll(/class="([^"]*)"/g)].flatMap(
    ([, classes]) => classes.split(/\s+/).filter(Boolean)
  )
  const compiler = await compile(
    await readFile(resolve(cssDir, 'roadie.css'), 'utf8'),
    {
      base: cssDir,
      loadStylesheet: async (id, base) => {
        const path =
          id === 'tailwindcss'
            ? require.resolve('tailwindcss/index.css')
            : resolve(base, id)
        return {
          path,
          base: dirname(path),
          content: await readFile(path, 'utf8')
        }
      }
    }
  )
  return compiler.build(candidates)
}

const parseRules = (css: string) => {
  const rules: Rule[] = []
  const walk = (text: string, layers: string[]) => {
    let depth = 0
    let start = 0
    let prelude = ''
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '{') {
        if (depth === 0) {
          prelude = text.slice(start, i).trim()
          start = i + 1
        }
        depth++
      } else if (text[i] === '}') {
        depth--
        if (depth === 0) {
          const inner = text.slice(start, i)
          const layer = prelude.match(/^@layer\s+([\w-]+)/)?.[1]
          if (prelude.startsWith('@')) {
            walk(inner, layer ? [...layers, layer] : layers)
          } else {
            rules.push({ selector: prelude, body: inner, layers })
          }
          start = i + 1
        }
      } else if (text[i] === ';' && depth === 0) {
        start = i + 1
      }
    }
  }
  walk(css.replace(/\/\*[\s\S]*?\*\//g, ''), [])
  return rules
}

const declaration = (body: string, property: string) =>
  body.match(new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`))?.[1].trim()

const isProse = (selector: string) =>
  /(^|[\s,(>+~])\.prose(\b|-)/.test(selector) &&
  !/\.text-display-prose/.test(selector)

let css = ''
let rules: Rule[] = []
let proseRules: Rule[] = []

beforeAll(async () => {
  css = await compileRoadie()
  rules = parseRules(css)
  proseRules = rules.filter(({ selector }) => isProse(selector))
})

const ruleFor = (selector: string) => {
  const rule = rules.find((r) => r.selector.replace(/\s+/g, ' ') === selector)
  if (!rule) throw new Error(`No rule for ${selector}`)
  return rule.body
}

describe('prose.css', () => {
  it('compiles without a safelist entry', () => {
    expect(proseRules.length).toBeGreaterThan(20)
  })

  it('puts every rule in the components layer', () => {
    for (const { selector, layers } of proseRules) {
      expect(layers, selector).toContain('components')
    }
  })

  it('has no :has()', () => {
    for (const { selector } of proseRules) {
      expect(selector).not.toContain(':has(')
    }
  })

  it('opts out under .not-prose and [data-not-prose]', () => {
    const escaped = proseRules.filter(({ selector }) =>
      selector.includes(':not(')
    )
    expect(escaped.length).toBeGreaterThan(20)
    for (const { selector } of escaped) {
      expect(selector).toContain('.not-prose')
      expect(selector).toContain('[data-not-prose]')
    }
  })

  it('reads only variables the compiled sheet defines', () => {
    const definitions = new Map<string, string[]>()
    for (const [, name, value] of css.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+)/g)) {
      definitions.set(name, [...(definitions.get(name) ?? []), value.trim()])
    }
    const used = new Set(
      proseRules.flatMap(({ body }) =>
        [...body.matchAll(/var\((--[\w-]+)/g)].map(([, name]) => name)
      )
    )

    expect(used.size).toBeGreaterThan(0)
    for (const name of used) {
      // An `@theme inline` name compiles to `--x: var(--x)` at most, which
      // resolves to nothing at runtime.
      const real = (definitions.get(name) ?? []).filter(
        (value) => value !== `var(${name})`
      )
      expect(real, name).not.toEqual([])
    }
  })

  it.each([1, 2, 3, 4, 5, 6])(
    'sizes and weights h%i like its text-display-prose utility',
    (level) => {
      const prose = ruleFor('.prose')
      const utility = ruleFor(`.text-display-prose-${level}`)
      const heading = proseRules.find(({ selector }) =>
        selector
          .replace(/\s+/g, ' ')
          .startsWith(`.prose :where(h${level}):not(`)
      )

      expect(heading?.body).toContain(`font-size: var(--prose-h${level}-size)`)
      expect(heading?.body).toContain(
        `font-weight: var(--prose-h${level}-weight)`
      )
      expect(declaration(prose, `--prose-h${level}-size`)).toBe(
        declaration(utility, 'font-size')
      )
      expect(declaration(prose, `--prose-h${level}-weight`)).toBe(
        declaration(utility, 'font-weight')
      )
    }
  )

  it('lets tables shrink to fit and scroll in .prose-scroll', () => {
    const table = proseRules.find(({ selector }) =>
      selector.replace(/\s+/g, ' ').startsWith('.prose :where(table):not(')
    )
    const scroll = proseRules.find(({ selector }) =>
      selector.replace(/\s+/g, ' ').startsWith('.prose :where(.prose-scroll)')
    )

    expect(table?.body).not.toMatch(/(^|[\s;])width\s*:/)
    expect(declaration(scroll?.body ?? '', 'overflow-x')).toBe('auto')
  })

  it('caps the measure at 65ch, except under .prose-bleed', () => {
    expect(css).toMatch(
      /@property --prose-measure\s*{[^}]*syntax: '<length> \| none'/
    )
    expect(declaration(ruleFor('.prose'), '--prose-measure')).toBe('65ch')
    expect(declaration(ruleFor('.prose > *'), 'max-inline-size')).toBe(
      'var(--prose-measure)'
    )
    expect(
      declaration(ruleFor('.prose > .prose-bleed'), 'max-inline-size')
    ).toBe('none')
  })
})
