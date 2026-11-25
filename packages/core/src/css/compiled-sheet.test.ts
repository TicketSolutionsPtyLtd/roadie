import { execSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join, resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'

const packageRoot = resolve(import.meta.dirname, '../..')
const OUTPUT = 'dist/roadie.compiled.css'

// Classes Roadie's own rules select on. They aren't utilities, so the
// safelist doesn't name them.
const OWN_SELECTORS = [
  'dark',
  'is-active',
  'is-disclosure-animated',
  'not-prose',
  'prose',
  'prose-bleed',
  'prose-scroll'
]

// Runs the package's own `build:css`, so the test reads what ships, but
// writes the sheet to a temp folder and leaves `dist` alone.
const buildCompiledSheet = () => {
  const { scripts } = JSON.parse(
    readFileSync(join(packageRoot, 'package.json'), 'utf8')
  ) as { scripts: Record<string, string> }
  const script = scripts['build:css'] ?? ''
  if (!script.includes(OUTPUT))
    throw new Error(`build:css no longer writes ${OUTPUT}`)
  const folder = mkdtempSync(join(tmpdir(), 'roadie-compiled-'))
  const sheet = join(folder, 'sheet')
  try {
    execSync(script.replace(OUTPUT, `"${sheet}"`), {
      cwd: packageRoot,
      stdio: 'pipe',
      env: {
        ...process.env,
        PATH: `${join(packageRoot, 'node_modules/.bin')}${delimiter}${process.env.PATH}`
      }
    })
    return readFileSync(sheet, 'utf8')
  } finally {
    rmSync(folder, { recursive: true, force: true })
  }
}

const classesIn = (css: string) => {
  const classes = new Set<string>()
  const selectors = css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .matchAll(/(?:^|[{};])\s*([^{};@][^{};]*)\{/g)
  for (const [, selector = ''] of selectors)
    for (const [, name = ''] of selector.matchAll(/\.((?:\\.|[\w-])+)/g))
      if (/^-?[_a-zA-Z\\]/.test(name)) classes.add(name.replace(/\\(.)/g, '$1'))
  return [...classes]
}

describe('roadie.compiled.css', () => {
  let sheet = ''
  beforeAll(() => {
    sheet = buildCompiledSheet()
  }, 30_000)

  it('holds Roadie utilities and no class safelist.html leaves out', () => {
    const safelist = readFileSync(
      join(import.meta.dirname, 'safelist.html'),
      'utf8'
    )
    const safelisted = new Set(
      [...safelist.matchAll(/class="([^"]*)"/g)].flatMap(([, names = '']) =>
        names.trim().split(/\s+/).filter(Boolean)
      )
    )
    const classes = classesIn(sheet)
    expect(classes).toContain('emphasis-strong')
    expect(classes).toContain('z-popover')
    expect(classes).toContain('ease-spring')
    expect(
      classes.filter(
        (name) => !safelisted.has(name) && !OWN_SELECTORS.includes(name)
      )
    ).toEqual([])
  })

  // Every supported browser draws oklch(), so a hex copy of a colour step is
  // bytes no browser uses.
  it('declares the colour scales in oklch() alone', () => {
    expect(sheet).toMatch(/--color-brand-light-9:oklch\(/)
    expect(sheet.match(/--color-[\w-]+:#[0-9a-f]+/g) ?? []).toEqual([])
  })

  it('needs no browser support for CSS nesting', () => {
    expect(sheet.replace(/"[^"]*"|'[^']*'/g, '').includes('&')).toBe(false)
  })
})
